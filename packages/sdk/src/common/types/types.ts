import { Env } from '@lombard.finance/sdk-common';

export const SUI_DEVNET_CHAIN = 'sui:devnet' as const;
export const SUI_TESTNET_CHAIN = 'sui:testnet' as const;
export const SUI_LOCALNET_CHAIN = 'sui:localnet' as const;
export const SUI_MAINNET_CHAIN = 'sui:mainnet' as const;

export type SuiChain =
  | typeof SUI_DEVNET_CHAIN
  | typeof SUI_TESTNET_CHAIN
  | typeof SUI_LOCALNET_CHAIN
  | typeof SUI_MAINNET_CHAIN;

export const OChainId = {
  ethereum: 1,
  holesky: 17000,
  binanceSmartChain: 56,
  binanceSmartChainTestnet: 97,
  sepolia: 11155111,
  base: 8453,
  baseSepoliaTestnet: 84532,
  berachain: 80094,
  berachainBartioTestnet: 80084,
  corn: 21000000,
  swell: 1923,
  sonic: 146,
  sonicBlazeTestnet: 57054,
  morph: 2818,
  morphHolesky: 2810,
  etherlink: 42793,
} as const;

export type TChainId = (typeof OChainId)[keyof typeof OChainId];

/**
 * Abstract EIP-1193 provider
 */
export interface IEIP1193Provider {
  request: (args: any) => Promise<any>;
}

export const getEthNetworkByEnv = (env: Env) =>
  env === Env.prod ? OChainId.ethereum : OChainId.holesky;

export const getBscNetworkByEnv = (env: Env) =>
  env === Env.prod
    ? OChainId.binanceSmartChain
    : OChainId.binanceSmartChainTestnet;

export const getBaseNetworkByEnv = (env: Env) =>
  env === Env.prod ? OChainId.base : OChainId.baseSepoliaTestnet;

export const getSuiNetworkByEnv = (env: Env) =>
  env === Env.prod ? 'sui:mainnet' : 'sui:testnet';

export const getSonicNetworkByEnv = (env: Env) =>
  env === Env.prod ? OChainId.sonic : OChainId.sonicBlazeTestnet;
