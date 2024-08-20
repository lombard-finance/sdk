import { OChainId, TChainId } from '../types/types';

export function isValidChain(chainId: number): chainId is TChainId {
  return Object.values(OChainId).includes(chainId as TChainId);
}
