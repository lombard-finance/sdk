import { Idl } from '@coral-xyz/anchor';

import { getConfig, networkToEnv } from '../const/getConfig';
import { SolanaNetwork } from '../types';
import assetRouterIdl from './asset_router.json';

export const getAssetRouterIdl = (network: SolanaNetwork): Idl => {
  const config = getConfig(networkToEnv[network]);
  if (!config.assetRouter) {
    throw new Error(
      `Asset Router program not configured for network: ${network}`,
    );
  }
  const programIdl = { ...assetRouterIdl } as unknown as Idl;
  programIdl.address = config.assetRouter;
  return programIdl;
};
