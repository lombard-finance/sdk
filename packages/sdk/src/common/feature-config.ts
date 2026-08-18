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
   * Enable/disable Morph chain support
   * @default false - Not yet fully supported
   */
  isMorphEnabled: boolean;

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

  /**
   * @deprecated No-op. Corn is retired, so the flag gates nothing and setting
   * it to true has no effect. Removed in the next major.
   */
  isCornEnabled: boolean;

  /**
   * @deprecated No-op. Swellchain is retired, so the flag gates nothing and
   * setting it to true has no effect. Removed in the next major.
   */
  isSwellchainEnabled: boolean;
}

export const featureConfig: FeatureConfig = {
  isMonadEnabled: true,
  isAvalancheMainnetEnabled: true,
  isAvalancheFujiEnabled: true,

  // Chains in asset catalog but not yet fully supported
  // These are hidden from UI until fully tested and released
  isBerachainEnabled: false,
  isMorphEnabled: false,
  isTacEnabled: false,
  isBobEnabled: false,
  isEtherlinkEnabled: false,

  // Retired chains: these flags gate nothing and are removed in the next major
  isCornEnabled: false,
  isSwellchainEnabled: false,
};
