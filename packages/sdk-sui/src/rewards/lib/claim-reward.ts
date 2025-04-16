import BigNumber from 'bignumber.js';
import axios from 'axios';
import { CommonWriteParameters } from '../../common/parameters';
import { SuiSignPersonalMessageFeature } from '@mysten/wallet-standard';
import {
  getApiConfig,
  getRewardSigningData,
  getRewardWithdrawalFee,
  isRewardTokenSupported,
  RewardToken,
  RewardWithdrawal,
  RewardWithdrawalStatus,
} from '@lombard.finance/sdk';

type Response = {
  withdrawal: {
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
};

export type ClaimRewardParameters = {
  /** The reward token. */
  rewardToken: RewardToken;
  /** The amount of reward to be withdrawn (claimed). */
  amount: BigNumber.Value;
  /** The destination address. */
  to: string;
} & CommonWriteParameters<SuiSignPersonalMessageFeature>;

const REQUEST_WITHDRAW_URL =
  '/api/v1/distribution/account/{from}/withdrawals/{to}';

/** Claims a reward */
export async function claimReward({
  account: from,
  rewardToken,
  amount,
  to,
  walletClient,
  env,
}: ClaimRewardParameters) {
  if (!isRewardTokenSupported(rewardToken)) {
    throw new Error(`Unknown reward token: ${RewardToken}`);
  }

  const withdrawalFee = await getRewardWithdrawalFee({
    address: from.address,
    rewardToken,
    env,
  });
  const signingData = await getRewardSigningData({
    from: from.address,
    to,
    amount,
    fee: withdrawalFee,
    rewardToken,
    env,
  });

  const { signature } = await walletClient.features[
    'sui:signPersonalMessage'
  ].signPersonalMessage({
    account: from,
    message: Buffer.from(signingData) as unknown as Uint8Array,
  });

  const payload = {
    amount: BigNumber(amount).toFixed(),
    fee: BigNumber(withdrawalFee).toFixed(),
    signature,
  };

  const { baseApiUrl } = getApiConfig(env);
  const { data: withdrawData } = await axios.post<Response>(
    REQUEST_WITHDRAW_URL.replace('{from}', from.address).replace('{to}', to),
    payload,
    {
      baseURL: baseApiUrl,
    },
  );

  return mapDataToRewardWithdrawal(withdrawData.withdrawal);
}

function mapDataToRewardWithdrawal(data: Response['withdrawal']) {
  const withdrawal: RewardWithdrawal = {
    amount: BigNumber(data.amount),
    rewardToken: RewardToken.BABY,
    fee: BigNumber(data.fee),
    to: data.to,
    signature: data.signature,
    status: data.status,
    txHash: data.tx_hash,
    timestamp: new Date(data.created_at),
  };
  return withdrawal;
}
