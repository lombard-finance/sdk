import BigNumber from 'bignumber.js';
import { Address } from 'viem';

import { getApiConfig } from '../common/api-config';
import { IEnvParam } from '../common/parameters';
import { httpRequest } from '../utils/http';

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
    throw new Error('Missing account address');
  }

  const { baseApiUrl } = getApiConfig(env);

  const url = `${baseApiUrl}/api/v1/analytics/${account}/additional-rewards`;
  const { data } = await httpRequest<Response>({ url: url, scope: 'public' });

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
