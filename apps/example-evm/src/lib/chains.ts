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
      { value: Chain.BOB, label: 'BOB' },
      { value: Chain.SONIC, label: 'Sonic' },
      { value: Chain.KATANA, label: 'Katana' },
    ];
  } else {
    return [
      { value: Chain.SEPOLIA, label: 'Sepolia' },
      { value: Chain.HOLESKY, label: 'Holesky' },
      { value: Chain.BASE_SEPOLIA, label: 'Base Sepolia' },
      { value: Chain.BSC_TESTNET, label: 'BNB Testnet' },
      { value: Chain.SONIC_BLAZE_TESTNET, label: 'Sonic Testnet' },
      { value: Chain.KATANA_TATARA, label: 'Katana Tatara' },
      { value: Chain.BERACHAIN_BARTIO, label: 'Berachain Bartio' },
    ];
  }
}

/**
 * Get default chain for environment
 */
export function getDefaultChain(env: Env): Chain {
  return env === Env.prod ? Chain.ETHEREUM : Chain.SEPOLIA;
}
