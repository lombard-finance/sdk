export const OEnv = {
  prod: 'prod',
  testnet: 'testnet',
  stage: 'stage',
} as const;

export type TEnv = (typeof OEnv)[keyof typeof OEnv];

export const OChainId = {
  ethereum: 1,
  holesky: 17000,
} as const;

export type TChainId = (typeof OChainId)[keyof typeof OChainId];

/**
 * Abstract EIP-1193 provider
 */
export interface IEIP1193Provider {
  request: (args: any) => Promise<any>;
}
