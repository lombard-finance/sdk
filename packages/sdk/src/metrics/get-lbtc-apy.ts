import axios from "axios";
import BigNumber from "bignumber.js";
import { Address, zeroAddress } from "viem";

import { getApiConfig } from "../common/api-config";
import { IEnvParam } from "../common/parameters";

type Response = {
  lbtc_base_apy: number;
  lbtc_effective_apy: number;
};

export type LbtcApy = {
  /**
   * The base APY for LBTC, representing the nominal yield without any bonuses
   * or adjustments.
   */
  baseApy: BigNumber;
  /**
   * The effective APY for LBTC, including any additional rewards,
   * compounding effects, or protocol-specific incentives.
   */
  effectiveApy: BigNumber;
};

/** Returns the current APY (annual percentage yield) for LBTC. */
export async function getApy({
  account,
  env,
}: {
  /** The optional account address. Pass it for more accurate APY data. */
  account?: Address;
} & IEnvParam) {
  const { baseApiUrl } = getApiConfig(env);

  const url = `${baseApiUrl}/api/v1/analytics/${account || zeroAddress}/apy`;
  const { data } = await axios.get<Response>(url);

  const apy: LbtcApy = {
    baseApy: BigNumber(data.lbtc_base_apy),
    effectiveApy: BigNumber(data.lbtc_effective_apy),
  };

  return apy;
}

type EstimatedApyResponse = { lbtc_estimated_apy: number };
export type LbtcEstimatedApy = {
  /**
   * The estimated APY for LBTC based on the specified partner context.
   *
   * This value reflects a projected annual percentage yield that may vary
   * depending on the `partnerId`, taking into account potential partner-specific
   * incentives, compounding assumptions, or estimated future rewards.
   */
  estimatedApy: BigNumber;
};

/** Returns the estimated APY for LBTC. */
export async function getEstimatedApy({
  partnerId,
  env,
}: { partnerId?: string } & IEnvParam) {
  const { baseApiUrl } = getApiConfig(env);

  const url = `${baseApiUrl}/api/v1/analytics/estimated-apy?partner_id=${partnerId || ""}`;
  const { data } = await axios.get<EstimatedApyResponse>(url);

  const apy: LbtcEstimatedApy = {
    estimatedApy: BigNumber(data.lbtc_estimated_apy),
  };

  return apy;
}
