import axios from 'axios';
import { Address } from 'viem';
import { getApiConfig } from '../common/api-config';
import { IEnvParam } from '../common/parameters';

type Response = {
  type: 'BALANCE_TYPE_DEFI' | 'BALANCE_TYPE_HOLDING';
  total_lbtc_balance: number;
  total_lbtc_balance_cost: number;
  total_rewards: number;
  total_rewards_cost: number;
  chains: { lbtc_balance: number; chain: string }[];
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

  const url = `${baseApiUrl}/api/v1/rewards/summary/${account}`;
  const { data } = await axios.get<Response>(url);

  return {
    type: data.type,
    totalLbtcBalance: data.total_lbtc_balance,
    totalRewards: data.total_rewards,
    totalRewardsCost: data.total_rewards_cost,
    chains: data.chains?.map(cd => ({
      balance: cd.lbtc_balance,
      chain: cd.chain, // TODO: Map this to chain id.
    })),
  };
}
// Response example:
//
// {
//   "type":"BALANCE_TYPE_HOLDING",
//   "total_lbtc_balance":0.00030997,
//   "total_lbtc_balance_cost":36.906438563500004,
//   "total_rewards":3.278178613395223e-8,
//   "total_rewards_cost":0.0039031486142352624,
//   "chains":[
//     {
//       "lbtc_balance":0.00030997,
//       "chain":"ethereum"
//     }
//   ]
// }
