import { Chain, Env } from '@lombard.finance/sdk';

/**
 * Chain options for different environments
 */
export interface ChainOption {
  value: Chain;
  label: string;
}

/**
 * Get available Starknet destination chains based on environment
 *
 * These chains have LBTC contracts deployed in the respective environments
 */
export function getAvailableChains(env: Env): ChainOption[] {
  if (env === Env.prod) {
    return [{ value: Chain.STARKNET_MAINNET, label: 'Starknet Mainnet' }];
  } else {
    return [{ value: Chain.STARKNET_SEPOLIA, label: 'Starknet Sepolia' }];
  }
}

/**
 * Get default chain for environment
 */
export function getDefaultChain(env: Env): Chain {
  return env === Env.prod ? Chain.STARKNET_MAINNET : Chain.STARKNET_SEPOLIA;
}
