export interface FeatureConfig {
  /**
   * Enable/disable Monad blockchain support
   * @default true - Enabled
   */
  isMonadEnabled: boolean;

  /**
   * Enable/disable Avalanche mainnet support
   * @default false - BTC.b not released on mainnet yet
   */
  isAvalancheMainnetEnabled: boolean;

  /**
   * Enable/disable Avalanche Fuji testnet support
   * @default true - Enabled for testing
   */
  isAvalancheFujiEnabled: boolean;

  /**
   * Enable/disable Berachain support
   * @default false - Not yet fully supported
   */
  isBerachainEnabled: boolean;

  /**
   * Enable/disable Corn chain support
   * @default false - Not yet fully supported
   */
  isCornEnabled: boolean;

  /**
   * Enable/disable Morph chain support
   * @default false - Not yet fully supported
   */
  isMorphEnabled: boolean;

  /**
   * Enable/disable Swellchain support
   * @default false - Not yet fully supported
   */
  isSwellchainEnabled: boolean;

  /**
   * Enable/disable TAC chain support
   * @default false - Not yet fully supported
   */
  isTacEnabled: boolean;

  /**
   * Enable/disable BOB chain support
   * @default false - Not yet fully supported
   */
  isBobEnabled: boolean;

  /**
   * Enable/disable Etherlink chain support
   * @default false - Not yet fully supported
   */
  isEtherlinkEnabled: boolean;

}

export const featureConfig: FeatureConfig = {
  isMonadEnabled: true,
  isAvalancheMainnetEnabled: true,
  isAvalancheFujiEnabled: true,

  isCornEnabled: true,
  // Chains in asset catalog but not yet fully supported
  // These are hidden from UI until fully tested and released
  isBerachainEnabled: false,
  isMorphEnabled: false,
  isSwellchainEnabled: false,
  isTacEnabled: false,
  isBobEnabled: false,
  isEtherlinkEnabled: false,
};
