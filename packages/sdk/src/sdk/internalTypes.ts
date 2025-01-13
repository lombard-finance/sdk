export const OChainName = {
  eth: 'DESTINATION_BLOCKCHAIN_ETHEREUM',
  ethOld: 'BLOCKCHAIN_ETHEREUM',

  base: 'DESTINATION_BLOCKCHAIN_BASE',
  baseOld: 'BLOCKCHAIN_BASE',

  bsc: 'DESTINATION_BLOCKCHAIN_BSC',
  bscOld: 'BLOCKCHAIN_BSC',
} as const;

export type TChainName = (typeof OChainName)[keyof typeof OChainName];
