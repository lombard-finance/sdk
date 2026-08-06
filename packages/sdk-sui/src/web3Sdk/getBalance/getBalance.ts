import { Env } from '@lombard.finance/sdk-common';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import type { WalletAccount } from '@wallet-standard/core';
import BigNumber from 'bignumber.js';

import { LBTC_DECIMALS } from '../../const';
import { getSuiCoinDecimals } from '../../utils/getSuiCoinDecimals';

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
    address: walletAccount.address,
    coinType,
  });

  // Fallback to LBTC decimals when CoinMetadata is not published (e.g. testnet)
  const decimals = (await getSuiCoinDecimals(client, coinType)) ?? LBTC_DECIMALS;

  const total = new BigNumber(balance.balance).div(
    new BigNumber(10).pow(decimals),
  );

  return { total };
}
