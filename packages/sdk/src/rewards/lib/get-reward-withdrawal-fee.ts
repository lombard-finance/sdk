import axios from 'axios';
import BigNumber from 'bignumber.js';
import { getApiConfig } from '../../common/api-config';
import { IEnvParam } from '../../common/parameters';
import { RewardToken, isRewardTokenSupported } from './reward-tokens';

const REWARDS_WITHDRAWAL_FEE_URL = '/api/v1/distribution/account/{address}/fee';

type FeeResponse = {
  fee: string;
};

export type GetRewardWithdrawalFeeParameters = {
  /** The account address. */
  address: string;
  /** The reward token. */
  rewardToken: RewardToken;
} & IEnvParam;

/** Gets the rewards withdrawal fee. */
export async function getRewardWithdrawalFee({
  address,
  rewardToken,
  env,
}: GetRewardWithdrawalFeeParameters) {
  if (!isRewardTokenSupported(rewardToken)) {
    throw new Error(`Unknown reward token: ${RewardToken}`);
  }

  const { baseApiUrl } = getApiConfig(env);
  const { data: feeData } = await axios.get<FeeResponse>(
    REWARDS_WITHDRAWAL_FEE_URL.replace('{address}', address),
    { baseURL: baseApiUrl },
  );

  return BigNumber(feeData.fee);
}
