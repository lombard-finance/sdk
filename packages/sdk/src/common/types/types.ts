export const OEnv = {
  prod: 'prod',
  testnet: 'testnet',
  stage: 'stage',
} as const;

export type TEnv = (typeof OEnv)[keyof typeof OEnv];

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
  morph: 2818,
  morphHolesky: 2810,
} as const;

export type TChainId = (typeof OChainId)[keyof typeof OChainId];

/**
 * Abstract EIP-1193 provider
 */
export interface IEIP1193Provider {
  request: (args: any) => Promise<any>;
}

export const getEthNetworkByEnv = (env: TEnv) =>
  env === OEnv.prod ? OChainId.ethereum : OChainId.holesky;

export const getBscNetworkByEnv = (env: TEnv) =>
  env === OEnv.prod
    ? OChainId.binanceSmartChain
    : OChainId.binanceSmartChainTestnet;

export const getBaseNetworkByEnv = (env: TEnv) =>
  env === OEnv.prod ? OChainId.base : OChainId.baseSepoliaTestnet;
