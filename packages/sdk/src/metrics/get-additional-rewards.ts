import axios from "axios";
import BigNumber from "bignumber.js";
import { Address } from "viem";

import { getApiConfig } from "../common/api-config";
import { IEnvParam } from "../common/parameters";

type Response = {
  btc_distributed: { name: string; amount: number }[];
  btc_undistributed: { name: string; amount: number }[];
};

export type RewardsDistribution = {
  /**
   * List of campaigns where rewards have been successfully distributed.
   */
  distributed: {
    /** Name of the reward campaign. */
    name: string;
    /** Amount of BTC distributed for this campaign. */
    amount: BigNumber;
  }[];

  /**
   * List of campaigns where rewards are pending or not yet distributed.
   */
  undistributed: {
    /** Name of the reward campaign. */
    name: string;
    /** Amount of BTC yet to be distributed. */
    amount: BigNumber;
  }[];
};

/**
 * Retrieves additional rewards that have been distributed or are pending
 * for a specific account.
 */
export async function getAdditionalRewards({
  account,
  env,
}: {
  account: Address;
} & IEnvParam) {
  if (!account) {
    throw new Error("Missing account address");
  }

  const { baseApiUrl } = getApiConfig(env);

  const url = `${baseApiUrl}/api/v1/analytics/${account}/additional-rewards`;
  const { data } = await axios.get<Response>(url);

  const distribution: RewardsDistribution = {
    distributed: data.btc_distributed.map((d) => ({
      amount: BigNumber(d.amount),
      name: d.name,
    })),
    undistributed: data.btc_undistributed.map((u) => ({
      amount: BigNumber(u.amount),
      name: u.name,
    })),
  };

  return distribution;
}

// url: https://bft-dev.stage.lombard-fi.com/api/v1/analytics/0x2513196b4fD01Ed5888d1dB49AB9a42208E9fF90/additional-rewards
// {"btc_distributed":[{"name":"ledger", "amount":0.7691864317643695}], "btc_undistributed":[{"name":"ledger", "amount":0.5699985451505658}]}
