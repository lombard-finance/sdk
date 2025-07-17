import { Env } from '@lombard.finance/sdk-common';
import { SuiClient } from '@mysten/sui/client';
import type { WalletAccount } from '@wallet-standard/core';
import BigNumber from 'bignumber.js';
import { ERROR_COIN_METADATA_NOT_FUND } from '../../const';

interface IGetBalanceParams {
  walletAccount: WalletAccount;
  client: SuiClient;
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
  const coinBalance = await client.getBalance({
    owner: walletAccount.address,
    coinType,
  });

  const coinMetadata = await client.getCoinMetadata({
    coinType,
  });

  if (!coinMetadata) {
    throw ERROR_COIN_METADATA_NOT_FUND;
  }

  const total = new BigNumber(coinBalance.totalBalance).div(
    new BigNumber(10).pow(coinMetadata.decimals),
  );

  return { total };
}
