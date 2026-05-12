import { Idl } from '@coral-xyz/anchor';
import { Env } from '@lombard.finance/sdk-common';

import { getConfig } from '../const/getConfig';
import assetRouterIdl from './asset_router.json';

export const getAssetRouterIdl = (env: Env): Idl => {
  const config = getConfig(env);
  if (!config.assetRouter) {
    throw new Error(`Asset Router program not configured for env: ${env}`);
  }
  const programIdl = { ...assetRouterIdl } as unknown as Idl;
  programIdl.address = config.assetRouter;
  return programIdl;
};
