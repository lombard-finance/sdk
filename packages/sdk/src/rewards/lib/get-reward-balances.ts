import { Address } from 'viem';
import { IEnvParam } from '../../common/parameters';
import { getApiConfig } from '../../common/api-config';
import axios from 'axios';
import { isRewardTokenSupported, RewardToken } from './reward-tokens';
import BigNumber from 'bignumber.js';

export enum RewardBlockchainType {
  Undefined = 'BLOCKCHAIN_TYPE_UNDEFINED',
  Evm = 'BLOCKCHAIN_TYPE_EVM',
  Sui = 'BLOCKCHAIN_TYPE_SUI',
  Solana = 'BLOCKCHAIN_TYPE_SOLANA',
  Cosmos = 'BLOCKCHAIN_TYPE_COSMOS',
}

type Response = {
  account: {
    id: string;
    address: string;
    available_balance: string;
    locked_balance: string;
    pending_balance: string;
    blockchain_type: RewardBlockchainType;
    created_at: string;
  };
};

const REWARDS_URL = '/api/v1/distribution/account/{address}';

export type GetRewardBalancesParameters = {
  /** The reward earner (claimer). */
  address: Address;
  /** The reward token. */
  rewardToken?: RewardToken;
} & IEnvParam;

export type RewardBalances = {
  /** The address of the reward earner (claimer). */
  address: Address;
  /** The available balance of the reward token (ready to be withdrawn). */
  availableBalance: BigNumber;
  /** The locked balance (in processing). */
  lockedBalance: BigNumber;
  /** The pending balance to be credited. */
  pendingBalance: BigNumber;
  /** The reward token. */
  rewardToken: RewardToken;
  /** The timestamp. */
  timestamp: Date;
};

/**
 * Gets the reward balances earned by the specified address.
 */
export async function getRewardBalances({
  address,
  rewardToken = RewardToken.BABY,
  env,
}: GetRewardBalancesParameters) {
  if (!isRewardTokenSupported(rewardToken)) {
    throw new Error(`Unknown reward token: ${RewardToken}`);
  }

  const { baseApiUrl } = getApiConfig(env);

  const { data } = await axios.get<Response>(
    REWARDS_URL.replace('{address}', address),
    { baseURL: baseApiUrl },
  );

  const balances: RewardBalances = {
    address,
    availableBalance: BigNumber(data.account.available_balance),
    lockedBalance: BigNumber(data.account.locked_balance),
    pendingBalance: BigNumber(data.account.pending_balance),
    rewardToken,
    timestamp: new Date(data.account.created_at),
  };

  return balances;
}
