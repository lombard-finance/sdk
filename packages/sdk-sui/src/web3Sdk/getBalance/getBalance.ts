import { Env } from "@lombard.finance/sdk-common";
import { SuiClient } from "@mysten/sui/client";
import type { WalletAccount } from "@wallet-standard/core";
import BigNumber from "bignumber.js";

import { LBTC_DECIMALS } from "../../const";

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

  // Fallback to LBTC decimals when CoinMetadata is not published (e.g. testnet)
  const decimals = coinMetadata?.decimals ?? LBTC_DECIMALS;

  const total = new BigNumber(coinBalance.totalBalance).div(
    new BigNumber(10).pow(decimals),
  );

  return { total };
}
