import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeStructTag } from '@mysten/sui/utils';
import type { WalletAccount } from '@wallet-standard/core';
import BigNumber from 'bignumber.js';

import { ERROR_NOT_ENOUGH_BALANCE } from '../../const';
import { resolveSuiCoinDecimals } from '../../utils/getSuiCoinDecimals';
import { getAllCoinsOfType, type ICoinOfType } from '../getAllCoinsOfType';

interface IPrepareCoinsTransactionParams {
  walletAccount: WalletAccount;
  client: SuiGrpcClient;
  amount: BigNumber;
  coinType: string;
}

/**
 * Builds a transaction holding a single `Coin<coinType>` of exactly `amount`.
 *
 * Funds received through `0x2::coin::send_funds` / `0x2::balance::send_funds`
 * sit in the address balance and have no Coin object, so `listCoins` misses
 * them. Coin objects are spent first, keeping the transaction free of a
 * `FundsWithdrawal` input when they cover the amount, since not every wallet
 * can sign one; only the shortfall is redeemed from the address balance.
 */
export async function prepareCoinsTransaction({
  walletAccount,
  client,
  amount,
  coinType,
}: IPrepareCoinsTransactionParams) {
  const [coins, { balance }, decimals] = await Promise.all([
    getAllCoinsOfType({ walletAccount, client, coinType }),
    client.core.getBalance({ owner: walletAccount.address, coinType }),
    resolveSuiCoinDecimals(client, coinType),
  ]);
  const addressBalance = BigInt(balance.addressBalance);

  const transaction = new Transaction();

  const preparedCoins = (() => {
    const unstakeAmount = BigInt(
      amount.multipliedBy(new BigNumber(10).pow(decimals)).toString(10),
    );

    const selectedCoins = [] as ICoinOfType[];
    let selectedAmount = BigInt(0);

    for (const coin of coins) {
      if (selectedAmount + BigInt(coin.balance) < unstakeAmount) {
        selectedCoins.push(coin);
        selectedAmount += BigInt(coin.balance);
      } else if (selectedAmount + BigInt(coin.balance) === unstakeAmount) {
        selectedCoins.push(coin);

        const coinObjects = selectedCoins.map((coin) =>
          transaction.object(coin.coinObjectId),
        );

        if (coinObjects.length > 1) {
          const [coin, ...rest] = coinObjects;
          transaction.mergeCoins(coin, rest);
          return coin;
        }

        return coinObjects[0];
      } else if (selectedAmount + BigInt(coin.balance) > unstakeAmount) {
        const remaining = unstakeAmount - selectedAmount;
        const [splitCoin] = transaction.splitCoins(
          transaction.object(coin.coinObjectId),
          [transaction.pure.u64(remaining)],
        );

        if (selectedCoins.length === 0) {
          return transaction.object(splitCoin);
        }

        transaction.mergeCoins(
          splitCoin,
          selectedCoins.map((coin) => transaction.object(coin.coinObjectId)),
        );

        return transaction.object(splitCoin);
      }
    }

    // Every Coin object is selected and still short of the amount.
    const shortfall = unstakeAmount - selectedAmount;
    if (shortfall <= 0n || addressBalance < shortfall) {
      throw ERROR_NOT_ENOUGH_BALANCE;
    }

    // `redeem_funds` yields exactly the reserved amount, and the reservation
    // aborts the transaction if the address balance cannot cover it.
    const [redeemedCoin] = transaction.moveCall({
      target: '0x2::coin::redeem_funds',
      typeArguments: [coinType],
      arguments: [
        transaction.withdrawal({
          amount: shortfall,
          type: normalizeStructTag(coinType),
        }),
      ],
    });

    if (selectedCoins.length > 0) {
      transaction.mergeCoins(
        redeemedCoin,
        selectedCoins.map((coin) => transaction.object(coin.coinObjectId)),
      );
    }

    return redeemedCoin;
  })();

  return { transaction, preparedCoins };
}
