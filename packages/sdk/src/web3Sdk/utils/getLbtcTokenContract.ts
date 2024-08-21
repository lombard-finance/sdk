import { TEnv } from '../../common/types/types';
import { isValidChain } from '../../common/utils/isValidChain';
import { Provider } from '../../provider';
import { getLbtcAddressConfig } from '../lbtcAddressConfig';
import { getTokenABI } from './getTokenABI';

export function getLbtcTokenContract(provider: Provider, env?: TEnv) {
  const lbtcAddressConfig = getLbtcAddressConfig(env);
  const { chainId } = provider;

  if (!isValidChain(chainId)) {
    throw new Error(`This chain ${chainId} is not supported`);
  }

  const tokenAddress = lbtcAddressConfig[chainId];

  if (!tokenAddress) {
    throw new Error(`Token address for chain ${chainId} is not defined`);
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
