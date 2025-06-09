import BigNumber from 'bignumber.js';
import { IEnvParam } from '../../common/parameters';
import axios from 'axios';
import { getApiConfig } from '../../common/api-config';
import { isRewardTokenSupported, RewardToken } from './reward-tokens';

const SIGNING_DATA_URL =
  '/api/v1/distribution/account/{from}/withdrawals/{to}/signing-data';
type SigningDataResponse = {
  data: string;
};

export type GetRewardSigningDataParameters = {
  /** The reward claimer account address. */
  from: string;
  /** The destination address. */
  to: string;
  /** The amount of reward to be withdrawn. */
  amount: BigNumber.Value;
  /** The withdrawal fee. */
  fee: BigNumber.Value;
  /** The reward token. */
  rewardToken: RewardToken;
  /** The signing data variant */
  variant?: 'json' | 'plain-text';
} & IEnvParam;

/** Retrieves the signing data (message) to be signed by the reward claimer. */
export async function getRewardSigningData({
  from,
  to,
  amount,
  fee,
  rewardToken,
  variant = 'json',
  env,
}: GetRewardSigningDataParameters) {
  if (!isRewardTokenSupported(rewardToken)) {
    throw new Error(`Unknown reward token: ${RewardToken}`);
  }

  const { baseApiUrl } = getApiConfig(env);
  const { data } = await axios.get<SigningDataResponse>(
    SIGNING_DATA_URL.replace('{from}', from).replace('{to}', to),
    {
      baseURL: baseApiUrl,
      params: {
        amount: BigNumber(amount).toFixed(),
        fee: BigNumber(fee).toFixed(),
        plain: variant === 'plain-text',
      },
    },
  );

  return data.data;
}
