import axios from 'axios';
import { Address } from 'viem';
import { getApiConfig } from '../common/api-config';
import { IEnvParam } from '../common/parameters';

type Response = {
  type: 'BALANCE_TYPE_DEFI';
  total_lbtc_balance: number;
  total_lbtc_balance_cost: number;
  total_rewards: number;
  total_rewards_cost: number;
};

/**
 * Gets the rewards info acquired by provided account address
 *
 * @experimental This function is not ready to be used in prod environment and will result with static and dummy data. Please do not rely on the data it returns.
 */
export async function getRewardsInfo({
  account,
  env,
}: { account: Address } & IEnvParam) {
  const { baseApiUrl } = getApiConfig(env);

  const url = `${baseApiUrl}/api/v1/rewards/${account}`;
  const { data } = await axios.get<Response>(url);

  return {
    type: data.type,
    totalLbtcBalance: data.total_lbtc_balance,
    totalRewards: data.total_rewards,
    totalRewardsCost: data.total_rewards_cost,
  };
}
