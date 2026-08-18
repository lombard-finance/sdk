import { Env } from '@lombard.finance/sdk-common';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import type { WalletAccount } from '@wallet-standard/core';
import BigNumber from 'bignumber.js';

import { resolveSuiCoinDecimals } from '../../utils/getSuiCoinDecimals';

interface IGetBalanceParams {
  walletAccount: WalletAccount;
  client: SuiGrpcClient;
  coinType: string;
  env?: Env;
}

interface IGetBalanceResult {
  total: BigNumber;
}

export async function getBalance({
  walletAccount,
  client,
  coinType,
}: IGetBalanceParams): Promise<IGetBalanceResult> {
  const { balance } = await client.core.getBalance({
    owner: walletAccount.address,
    coinType,
  });

  const decimals = await resolveSuiCoinDecimals(client, coinType);

  const total = new BigNumber(balance.balance).div(
    new BigNumber(10).pow(decimals),
  );

  return { total };
}
