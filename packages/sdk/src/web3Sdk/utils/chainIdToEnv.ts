import { OChainId, OEnv, TChainId, TEnv } from '../../common/types/types';

const PROD_NATIVE_MINT_CHAINS = [
  OChainId.ethereum,
  OChainId.base,
  OChainId.binanceSmartChain,
] as TChainId[];

export const chainIdToEnv = (chainId: TChainId): TEnv => {
  return PROD_NATIVE_MINT_CHAINS.includes(chainId) ? OEnv.prod : OEnv.stage;
};
