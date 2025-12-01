export interface FeatureConfig {
  /**
   * Enable/disable Monad blockchain support
   * @default false - Currently disabled
   */
  isMonadEnabled: boolean;

  /**
   * Enable/disable Avalanche blockchain support
   * @default false - Currently disabled
   */
  isAvalancheEnabled: boolean;
}

export const featureConfig: FeatureConfig = {
  isMonadEnabled: false,
  isAvalancheEnabled: false,
};
