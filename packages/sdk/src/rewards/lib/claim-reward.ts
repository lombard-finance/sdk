import axios from 'axios';
import BigNumber from 'bignumber.js';
import { makeWalletClient } from '../../clients/wallet-client';
import { getApiConfig } from '../../common/api-config';
import { CommonWriteParameters } from '../../common/parameters';
import { getRewardSigningData } from './get-reward-signing-data';
import { getRewardWithdrawalFee } from './get-reward-withdrawal-fee';
import {
  WithdrawalData,
  mapDataToRewardWithdrawal,
} from './get-reward-withdrawals';
import { RewardToken, isRewardTokenSupported } from './reward-tokens';

type Response = {
  withdrawal: WithdrawalData;
};

export type ClaimRewardParameters = {
  /** The reward token. */
  rewardToken: RewardToken;
  /** The amount of reward to be withdrawn (claimed). */
  amount: BigNumber.Value;
  /** The destination address. */
  to: string;
  /** Signing data variant */
  signingDataVariant?: Parameters<typeof getRewardSigningData>[0]['variant'];
} & CommonWriteParameters;

const REQUEST_WITHDRAW_URL =
  '/api/v1/distribution/account/{from}/withdrawals/{to}';

/** Claims a reward. */
export async function claimReward({
  account: from,
  rewardToken,
  amount,
  to,
  signingDataVariant,
  chainId,
  provider,
  env,
}: ClaimRewardParameters) {
  if (!isRewardTokenSupported(rewardToken)) {
    throw new Error(`Unknown reward token: ${RewardToken}`);
  }

  const walletClient = makeWalletClient({
    chainId,
    provider,
  });

  const withdrawalFee = await getRewardWithdrawalFee({
    address: from,
    rewardToken,
    env,
  });
  const signingData = await getRewardSigningData({
    from,
    to,
    amount,
    fee: withdrawalFee,
    rewardToken,
    variant: signingDataVariant,
    env,
  });

  const signature = await walletClient.signMessage({
    account: from,
    message: signingData,
  });

  const payload = {
    amount: BigNumber(amount).toFixed(),
    fee: BigNumber(withdrawalFee).toFixed(),
    signature,
    plain: signingDataVariant === 'plain-text',
  };

  const { baseApiUrl } = getApiConfig(env);
  const { data: withdrawData } = await axios.post<Response>(
    REQUEST_WITHDRAW_URL.replace('{from}', from).replace('{to}', to),
    payload,
    {
      baseURL: baseApiUrl,
    },
  );

  return mapDataToRewardWithdrawal(withdrawData.withdrawal);
}
