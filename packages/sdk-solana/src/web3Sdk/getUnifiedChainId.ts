import { SolanaNetwork } from '../types';

const ERROR_NOT_FOUND_UNIFIED_ID = new Error("Unified ID hasn't been found");

/**
 * It's an internal type defined by the backend.
 * The main purpose is the unification of chain IDs for different networks.
 */
const UnifiedChainId = {
  [SolanaNetwork.devnet]:
    '1063388738761200999231335106130623820923059005171000690717713454345365488555',
  [SolanaNetwork.testnet]: 'not_applicable',
  [SolanaNetwork.mainnet]:
    '977795225684978869420534708198397830756781198870511151491297393641706520304',
} as Record<SolanaNetwork, string>;

type UnifiedChainId = (typeof UnifiedChainId)[keyof typeof UnifiedChainId];

export function getUnifiedChainId(chainId: SolanaNetwork) {
  const unifiedChainId = UnifiedChainId[chainId];

  if (!unifiedChainId) {
    throw ERROR_NOT_FOUND_UNIFIED_ID;
  }

  return unifiedChainId;
}
