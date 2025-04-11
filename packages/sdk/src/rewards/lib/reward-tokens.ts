export enum RewardToken {
  BABY = 'BABY',
}

export function isRewardTokenSupported(rewardToken: RewardToken) {
  return rewardToken === RewardToken.BABY;
}
