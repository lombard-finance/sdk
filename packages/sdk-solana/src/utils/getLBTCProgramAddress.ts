import { Env, getConfig } from '../const/getConfig';
import { SolanaNetwork } from '../types';

export function getLBTCProgramAddress(env: Env): string;
export function getLBTCProgramAddress(network: SolanaNetwork): string;
export function getLBTCProgramAddress(
  envOrNetwork: Env | SolanaNetwork,
): string {
  if (typeof envOrNetwork === 'string') {
    const network = envOrNetwork as SolanaNetwork;
    return getLBTCProgramAddress(network);
  }

  const config = getConfig(envOrNetwork);
  return config.lbtcProgramId;
}
