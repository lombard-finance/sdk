import { OChainId, TChainId } from '../../common/types/types';
import { Env } from '@lombard.finance/sdk-common';

const PROD_NATIVE_MINT_CHAINS = [
  OChainId.ethereum,
  OChainId.base,
  OChainId.binanceSmartChain,
] as TChainId[];

export const chainIdToEnv = (chainId: TChainId): Env => {
  return PROD_NATIVE_MINT_CHAINS.includes(chainId) ? Env.prod : Env.stage;
};
