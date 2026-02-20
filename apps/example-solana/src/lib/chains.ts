import { Chain, Env } from '@lombard.finance/sdk';

/**
 * Chain options for different environments
 */
export interface ChainOption {
  value: Chain;
  label: string;
}

/**
 * Get available Solana destination chains based on environment
 *
 * These chains have LBTC contracts deployed in the respective environments
 */
export function getAvailableChains(env: Env): ChainOption[] {
  if (env === Env.prod) {
    return [{ value: Chain.SOLANA_MAINNET, label: 'Solana Mainnet' }];
  } else {
    return [{ value: Chain.SOLANA_DEVNET, label: 'Solana Devnet' }];
  }
}

/**
 * Get default chain for environment
 */
export function getDefaultChain(env: Env): Chain {
  return env === Env.prod ? Chain.SOLANA_MAINNET : Chain.SOLANA_DEVNET;
}
