import {
  SUI_MAINNET_CHAIN,
  SUI_TESTNET_CHAIN,
  SuiChain,
} from "@mysten/wallet-standard";

const ERROR_NOT_FOUND_UNIFIED_ID = new Error("Unified ID hasn't been found");

/**
 * It's an internal type defined by the backend.
 * The main purpose is the unification of chain IDs for different networks.
 */
const UnifiedChainId = {
  [SUI_TESTNET_CHAIN]:
    "452312848583266388373324160190187140051835877600158453279131187532193639852",
  [SUI_MAINNET_CHAIN]:
    "452312848583266388373324160190187140051835877600158453279131187531808459402",
} as Record<SuiChain, string>;

type UnifiedChainId = (typeof UnifiedChainId)[keyof typeof UnifiedChainId];

export function getUnifiedChainId(chainId: SuiChain) {
  const unifiedChainId = UnifiedChainId[chainId];

  if (!unifiedChainId) {
    throw ERROR_NOT_FOUND_UNIFIED_ID;
  }

  return unifiedChainId;
}
