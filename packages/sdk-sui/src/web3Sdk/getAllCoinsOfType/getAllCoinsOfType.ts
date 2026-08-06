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
    // No page size is passed: the gRPC core client does not forward one to the
    // node today, so the server default governs and the loop follows the
    // cursor to the end regardless.
    const response = await client.core.getCoins({
      address: walletAccount.address,
      coinType,
      cursor,
    });

    for (const coin of response.objects) {
      coins.push({ coinObjectId: coin.id, balance: coin.balance });
    }

    cursor = response.hasNextPage ? response.cursor : null;
  } while (cursor);

  return coins;
}
