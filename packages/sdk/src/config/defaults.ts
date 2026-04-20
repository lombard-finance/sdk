import type { Env } from '@lombard.finance/sdk-common';

import { ChainId } from '../common/chains';

type ChainDescriptor = {
  id: ChainId;
  name: string;
  type: 'evm' | 'bitcoin' | 'solana' | 'sui' | 'starknet';
};

interface FeatureFlags {
  analytics: boolean;
  sandbox: boolean;
}

/**
 * Default configuration for each environment
 */
interface DefaultConfig {
  chains: ChainDescriptor[];
  features: FeatureFlags;
}

/**
 * Get default configuration for an environment
 *
 * @param env - Environment identifier
 * @returns Default configuration for the environment
 */
export function getDefaultConfig(env: Env): DefaultConfig {
  const baseFeatures: FeatureFlags = {
    analytics: false,
    sandbox: env !== 'prod',
  };

  // Default chains based on environment
  const defaultChains: ChainDescriptor[] = [
    {
      id: env === 'prod' ? (1 as ChainId) : (11155111 as ChainId), // Ethereum mainnet or Sepolia
      name: env === 'prod' ? 'Ethereum' : 'Sepolia',
      type: 'evm',
    },
  ];

  return {
    chains: defaultChains,
    features: baseFeatures,
  };
}
