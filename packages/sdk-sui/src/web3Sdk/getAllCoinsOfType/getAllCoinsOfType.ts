import { SuiGrpcClient } from '@mysten/sui/grpc';
import type { WalletAccount } from '@wallet-standard/core';

interface IGetAllCoinsOfTypeParams {
  walletAccount: WalletAccount;
  client: SuiGrpcClient;
  coinType: string;
}

/** A coin object owned by the wallet, in the shape the callers select on. */
export interface ICoinOfType {
  coinObjectId: string;
  balance: string;
}

export async function getAllCoinsOfType({
  walletAccount,
  client,
  coinType,
}: IGetAllCoinsOfTypeParams): Promise<ICoinOfType[]> {
  let cursor: string | null = null;
  const coins: ICoinOfType[] = [];

  do {
    const response = await client.core.listCoins({
      owner: walletAccount.address,
      coinType,
      cursor,
      limit: 50,
    });

    for (const coin of response.objects) {
      coins.push({ coinObjectId: coin.objectId, balance: coin.balance });
    }

    cursor = response.hasNextPage ? response.cursor : null;
  } while (cursor);

  return coins;
}
