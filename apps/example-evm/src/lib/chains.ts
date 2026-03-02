import { Chain, Env } from '@lombard.finance/sdk';

/**
 * Chain options for different environments
 */
export interface ChainOption {
  value: Chain;
  label: string;
}

/**
 * Get available EVM destination chains based on environment
 *
 * These chains have LBTC contracts deployed in the respective environments
 */
export function getAvailableChains(env: Env): ChainOption[] {
  if (env === Env.prod) {
    return [
      { value: Chain.ETHEREUM, label: 'Ethereum' },
      { value: Chain.BASE, label: 'Base' },
      { value: Chain.BSC, label: 'BNB Chain' },
      { value: Chain.KATANA, label: 'Katana' },
      { value: Chain.SONIC, label: 'Sonic' },
      { value: Chain.MONAD, label: 'Monad' },
      { value: Chain.STABLE, label: 'Stable' },
    ];
  } else if (env === Env.testnet) {
    return [
      { value: Chain.BASE_SEPOLIA, label: 'Base Sepolia' },
      { value: Chain.SEPOLIA, label: 'Sepolia' },
      { value: Chain.BSC_TESTNET, label: 'BNB Testnet' },
      { value: Chain.AVALANCHE_FUJI, label: 'Fuji' },
    ];
  } else {
    // stage
    return [
      { value: Chain.BASE_SEPOLIA, label: 'Base Sepolia' },
      { value: Chain.SEPOLIA, label: 'Sepolia' },
      { value: Chain.BSC_TESTNET, label: 'BNB Testnet' },
    ];
  }
}

/**
 * Get default chain for environment
 */
export function getDefaultChain(env: Env): Chain {
  if (env === Env.prod) return Chain.ETHEREUM;
  return Chain.BASE_SEPOLIA;
}
