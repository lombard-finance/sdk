import { Idl } from '@coral-xyz/anchor';
import { Env } from '@lombard.finance/sdk-common';

import { getConfig } from '../const/getConfig';
import consortiumIdl from './consortium.json';

export const getConsortiumIdl = (env: Env): Idl => {
  const config = getConfig(env);
  if (!config.consortium) {
    throw new Error(`Consortium program not configured for env: ${env}`);
  }
  const programIdl = { ...consortiumIdl } as unknown as Idl;
  programIdl.address = config.consortium;
  return programIdl;
};
