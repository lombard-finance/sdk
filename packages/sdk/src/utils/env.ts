import { Env } from '@lombard.finance/sdk-common';

import { ChainId } from '../common/chains';

const PROD_NATIVE_MINT_CHAINS = [
  ChainId.ethereum,
  ChainId.base,
  ChainId.berachain,
  ChainId.binanceSmartChain,
  ChainId.etherlink,
  ChainId.katana,
  ChainId.morph,
  ChainId.sonic,
  ChainId.swell,
] as ChainId[];

export const determineEnv = (chainId: ChainId): Env => {
  return PROD_NATIVE_MINT_CHAINS.includes(chainId) ? Env.prod : Env.stage;
};
