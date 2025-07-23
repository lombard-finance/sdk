import axios from 'axios';
import { Address, zeroAddress } from 'viem';
import BigNumber from 'bignumber.js';
import { getApiConfig } from '../common/api-config';
import { IEnvParam } from '../common/parameters';

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

// url: https://bft-dev.stage.lombard.finance/api/v1/analytics/0x2513196b4fD01Ed5888d1dB49AB9a42208E9fF90/apy
// {"lbtc_base_apy":0.18849167223827507, "lbtc_effective_apy":0.6828761605761976}
