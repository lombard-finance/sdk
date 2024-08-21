export const OChainName = {
  eth: 'DESTINATION_BLOCKCHAIN_ETHEREUM',
} as const;

export type TChainName = (typeof OChainName)[keyof typeof OChainName];
