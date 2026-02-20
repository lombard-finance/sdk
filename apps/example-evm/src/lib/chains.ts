import { Chain, Env } from '@lombard.finance/sdk';

/**
 * Chain options for different environments
 */
export interface ChainOption {
  value: Chain;
  label: string;
}

/**
 * Get available destination chains based on environment
 *
 * These chains have LBTC contracts deployed in the respective environments
 */
export function getAvailableChains(env: Env): ChainOption[] {
  if (env === Env.prod) {
    // Production - Mainnet chains with LBTC deployed
    return [
      // EVM Chains
      { value: Chain.ETHEREUM, label: 'Ethereum' },
      { value: Chain.BASE, label: 'Base' },
      { value: Chain.BSC, label: 'BNB Chain' },
      { value: Chain.BOB, label: 'BOB' },
      { value: Chain.SONIC, label: 'Sonic' },
      { value: Chain.KATANA, label: 'Katana' },
      // Non-EVM Chains
      { value: Chain.SOLANA_MAINNET, label: 'Solana Mainnet' },
      { value: Chain.SUI_MAINNET, label: 'Sui Mainnet' },
      { value: Chain.STARKNET_MAINNET, label: 'Starknet Mainnet' },
    ];
  } else {
    // Testnet/Stage - Testnet chains with LBTC deployed
    return [
      // EVM Chains
      { value: Chain.SEPOLIA, label: 'Sepolia' },
      { value: Chain.HOLESKY, label: 'Holesky' },
      { value: Chain.BASE_SEPOLIA, label: 'Base Sepolia' },
      { value: Chain.BSC_TESTNET, label: 'BNB Testnet' },
      { value: Chain.SONIC_BLAZE_TESTNET, label: 'Sonic Testnet' },
      { value: Chain.KATANA_TATARA, label: 'Katana Tatara' },
      { value: Chain.BERACHAIN_BARTIO, label: 'Berachain Bartio' },
      // Non-EVM Chains
      { value: Chain.SOLANA_DEVNET, label: 'Solana Devnet' },
      { value: Chain.SUI_TESTNET, label: 'Sui Testnet' },
      { value: Chain.STARKNET_SEPOLIA, label: 'Starknet Sepolia' },
    ];
  }
}

/**
 * Get default chain for environment
 */
export function getDefaultChain(env: Env): Chain {
  return env === Env.prod ? Chain.ETHEREUM : Chain.SEPOLIA;
}
