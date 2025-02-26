import type { WalletAccount } from '@wallet-standard/core';
import type { CoinStruct } from '@mysten/sui/client';
import { SuiClient } from '@mysten/sui/client';

interface IUnstakeLBTCParams {
  walletAccount: WalletAccount;
  client: SuiClient;
  coinType: string;
}

export async function getAllCoinsOfType({
  walletAccount,
  client,
  coinType,
}: IUnstakeLBTCParams) {
  let cursor: string | null | undefined = undefined;
  let coins: CoinStruct[] = [];

  do {
    const response = await client.getCoins({
      owner: walletAccount.address,
      coinType,
      cursor,
      limit: 50,
    });

    coins = coins.concat(response.data);
    cursor = response.nextCursor;
  } while (cursor);

  return coins;
}
