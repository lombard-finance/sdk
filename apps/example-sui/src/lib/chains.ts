import { Chain, Env } from "@lombard.finance/sdk";

/**
 * Chain options for different environments
 */
export interface ChainOption {
  value: Chain;
  label: string;
}

/**
 * Get available Sui destination chains based on environment
 *
 * These chains have LBTC contracts deployed in the respective environments
 */
export function getAvailableChains(env: Env): ChainOption[] {
  if (env === Env.prod) {
    return [{ value: Chain.SUI_MAINNET, label: "Sui Mainnet" }];
  } else {
    return [{ value: Chain.SUI_TESTNET, label: "Sui Testnet" }];
  }
}

/**
 * Get default chain for environment
 */
export function getDefaultChain(env: Env): Chain {
  return env === Env.prod ? Chain.SUI_MAINNET : Chain.SUI_TESTNET;
}
