import { TChainId, TEnv } from '../../common/types/types';
import { Provider } from '../../provider';
import { getLbtcAddressConfig } from '../lbtcAddressConfig';
import { getTokenABI } from './getTokenABI';

export function getLbtcTokenContract(provider: Provider, env?: TEnv) {
  const lbtcAddressConfig = getLbtcAddressConfig(env);

  const tokenAddress = lbtcAddressConfig[provider.chainId as TChainId];

  if (!tokenAddress) {
    throw new Error(
      `Token address for chain ${provider.chainId} is not defined`,
    );
  }

  const abi = getTokenABI('LBTC');

  const contract = provider.createContract(abi, tokenAddress);

  if (!contract.options.address) {
    contract.options.address = tokenAddress;
  }

  return contract as typeof contract & {
    options: typeof contract.options & { address: string };
  };
}
