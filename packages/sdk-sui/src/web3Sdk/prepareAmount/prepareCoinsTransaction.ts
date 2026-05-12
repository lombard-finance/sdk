import type { CoinStruct } from '@mysten/sui/client';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import type { WalletAccount } from '@wallet-standard/core';
import BigNumber from 'bignumber.js';

import { LBTC_DECIMALS } from '../../const';
import { ERROR_NOT_ENOUGH_BALANCE } from '../../const';
import { getAllCoinsOfType } from '../getAllCoinsOfType';

interface IUnstakeLBTCParams {
  walletAccount: WalletAccount;
  client: SuiClient;
  amount: BigNumber;
  coinType: string;
}

export async function prepareCoinsTransaction({
  walletAccount,
  client,
  amount,
  coinType,
}: IUnstakeLBTCParams) {
  const coins = await getAllCoinsOfType({ walletAccount, client, coinType });

  const transaction = new Transaction();

  const preparedCoins = await (async () => {
    const coinMetadata = await client.getCoinMetadata({
      coinType,
    });

    // Fallback to LBTC decimals when CoinMetadata is not published (e.g. testnet)
    const decimals = coinMetadata?.decimals ?? LBTC_DECIMALS;

    const unstakeAmount = BigInt(
      amount.multipliedBy(new BigNumber(10).pow(decimals)).toString(10),
    );

    const selectedCoins = [] as CoinStruct[];
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
    throw ERROR_NOT_ENOUGH_BALANCE;
  })();

  return { transaction, preparedCoins };
}
