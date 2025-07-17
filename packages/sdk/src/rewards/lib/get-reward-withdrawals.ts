import axios from 'axios';
import BigNumber from 'bignumber.js';
import { Address } from 'viem';
import { getApiConfig } from '../../common/api-config';
import { IEnvParam } from '../../common/parameters';
import { ensureHex } from '../../utils/hex';
import { RewardToken } from './reward-tokens';

const REWARDS_WITHDRAWALS_URL =
  '/api/v1/distribution/account/{address}/withdrawals';

export enum RewardWithdrawalStatus {
  /** Unspecified withdrawal status */
  Unspecified = 'WITHDRAWAL_STATUS_UNSPECIFIED',
  /** The withdrawal is pending (processing). */
  Pending = 'WITHDRAWAL_STATUS_PENDING',
  /** The withdrawal has been sent. */
  Sent = 'WITHDRAWAL_STATUS_SENT',
  /** The withdrawal is confirmed. */
  Confirmed = 'WITHDRAWAL_STATUS_CONFIRMED',
}

export type WithdrawalData = {
  account_id: string;
  amount: string;
  created_at: string;
  fee: string;
  id: string;
  nonce: string;
  signature: string;
  status: RewardWithdrawalStatus;
  to: string;
  tx_hash?: string;
};

type WithdrawalsResponse = {
  withdrawals?: WithdrawalData[];
};

export type GetRewardsWithdrawalsParameters = {
  address: Address;
} & IEnvParam;

export type RewardWithdrawal = {
  /** The withdrawn (claimed) amount of rewards token. */
  amount: BigNumber;
  /** The reward token. */
  rewardToken: RewardToken;
  /** The applied withdrawal fee. */
  fee: BigNumber;
  /** The destination address. */
  to: string;
  /** The signature used. */
  signature: string;
  /** The withdrawal status. */
  status: RewardWithdrawalStatus;
  /** The transaction hash. */
  txHash?: string;
  /** The timestamp */
  timestamp: Date;
};

/** Gets the reward withdrawals made by the specified address. */
export async function getRewardWithdrawals({
  address,
  env,
}: GetRewardsWithdrawalsParameters) {
  const { baseApiUrl } = getApiConfig(env);
  const { data: withdrawalsData } = await axios.get<WithdrawalsResponse>(
    REWARDS_WITHDRAWALS_URL.replace('{address}', address),
    { baseURL: baseApiUrl },
  );

  const withdrawals: RewardWithdrawal[] =
    withdrawalsData?.withdrawals?.map(mapDataToRewardWithdrawal) || [];

  return withdrawals;
}

export function mapDataToRewardWithdrawal(data: WithdrawalData) {
  const withdrawal: RewardWithdrawal = {
    amount: BigNumber(data.amount),
    rewardToken: RewardToken.BABY,
    fee: BigNumber(data.fee),
    to: data.to,
    signature: ensureHex(data.signature),
    status: data.status,
    txHash: data.tx_hash,
    timestamp: new Date(data.created_at),
  };
  return withdrawal;
}
