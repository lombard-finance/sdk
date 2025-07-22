import axios from 'axios';
import BigNumber from 'bignumber.js';
import { Address } from 'viem';
import { getApiConfig } from '../common/api-config';
import { IEnvParam } from '../common/parameters';
import { BlockchainIdentifier } from '../common/blockchain-identifier';

type Response = {
  btc_price_usd: { price: number; timestamp: string };
  staked_balance: number;
  rewards: number;
  chain_breakdown: {
    staked_balance: number;
    rewards: number;
    chain: BlockchainIdentifier;
  }[];
  last_updated: string;
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

  const url = `${baseApiUrl}/api/v1/accounts/${account}/summary`;
  const { data } = await axios.get<Response>(url);

  const info = {
    btcPrice: {
      price: BigNumber(data.btc_price_usd.price || 0),
      timestamp: new Date(data.btc_price_usd.timestamp),
    },
    stakedBalance: BigNumber(data.staked_balance || 0),
    totalRewards: BigNumber(data.rewards || 0),
    chainBreakdown: data.chain_breakdown?.map(cd => ({
      stakedBalance: BigNumber(cd.staked_balance || 0),
      rewards: BigNumber(cd.rewards || 0),
      chain: cd.chain,
    })),
    lastUpdated: new Date(data.last_updated),
  };

  return info;
}

// Response example:
// url: https://bft-dev.stage.lombard.finance/api/v1/accounts/0x2513196b4fD01Ed5888d1dB49AB9a42208E9fF90/summary
//
// {
//   btc_price_usd: { price: 118597.502311, timestamp: '2025-07-22T14:17:23Z' },
//   staked_balance: 0.00038944,
//   rewards: 8.716900890527854e-8,
//   chain_breakdown: [
//     {
//       staked_balance: 0.00018844,
//       rewards: 4.217884151117165e-8,
//       chain: 'DESTINATION_BLOCKCHAIN_BSC',
//     },
//     {
//       staked_balance: 0.000201,
//       rewards: 4.4990167394106886e-8,
//       chain: 'DESTINATION_BLOCKCHAIN_ETHEREUM',
//     },
//   ],
//   last_updated: '2025-07-22T15:07:20.502595933Z',
// }
