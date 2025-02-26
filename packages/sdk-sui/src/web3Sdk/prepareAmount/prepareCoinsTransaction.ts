import { Transaction } from '@mysten/sui/transactions';
import type { WalletAccount } from '@wallet-standard/core';
import type { CoinStruct } from '@mysten/sui/client';
import { SuiClient } from '@mysten/sui/client';
import BigNumber from 'bignumber.js';
import { ERROR_COIN_METADATA_NOT_FUND } from '../../const';
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

  const preparedCoins = await (async function () {
    const coinMetadata = await client.getCoinMetadata({
      coinType,
    });

    if (!coinMetadata) {
      throw ERROR_COIN_METADATA_NOT_FUND;
    }

    const unstakeAmount = BigInt(
      amount
        .multipliedBy(new BigNumber(10).pow(coinMetadata.decimals))
        .toString(10),
    );

    const selectedCoins = [] as CoinStruct[];
    let selectedAmount = BigInt(0);

    for (const coin of coins) {
      selectedCoins.push(coin);
      selectedAmount += BigInt(coin.balance);
      if (selectedAmount >= unstakeAmount) break;
    }

    if (selectedAmount > unstakeAmount) {
      const [splitCoin] = transaction.splitCoins(
        transaction.object(selectedCoins[0].coinObjectId),
        [transaction.pure.u64(unstakeAmount)],
      );

      return transaction.object(splitCoin);
    } else {
      const coinObjectsIds = selectedCoins.map(coin =>
        transaction.object(coin.coinObjectId),
      );

      if (coinObjectsIds.length > 1) {
        const [coin, ...rest] = coinObjectsIds;
        return transaction.mergeCoins(coin, rest);
      }

      return coinObjectsIds[0];
    }
  })();

  return { transaction, preparedCoins };
}
