import { Idl } from '@coral-xyz/anchor';

import { getConfig, networkToEnv } from '../const/getConfig';
import { SolanaNetwork } from '../types';
import consortiumIdl from './consortium.json';

export const getConsortiumIdl = (network: SolanaNetwork): Idl => {
  const config = getConfig(networkToEnv[network]);
  if (!config.consortium) {
    throw new Error(
      `Consortium program not configured for network: ${network}`,
    );
  }
  const programIdl = { ...consortiumIdl } as unknown as Idl;
  programIdl.address = config.consortium;
  return programIdl;
};
