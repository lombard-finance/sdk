import { TEnv } from '../../common/types/types';
import { isValidChain } from '../../common/utils/isValidChain';
import { Provider } from '../../provider';
import { getBasculeAddressConfig } from '../basculeAddressConfig';
import { BASCULE_ABI } from '../abi';

export function getBasculeTokenContract(provider: Provider, env?: TEnv) {
  const basculeAddressConfig = getBasculeAddressConfig(env);
  const { chainId } = provider;

  if (!isValidChain(chainId)) {
    throw new Error(`This chain ${chainId} is not supported`);
  }

  const contractAddress = basculeAddressConfig[chainId];

  if (!contractAddress) {
    throw new Error(`The address for bascule module is not defined`);
  }

  const contract = provider.createContract(BASCULE_ABI, contractAddress);

  if (!contract.options.address) {
    contract.options.address = contractAddress;
  }

  return contract as typeof contract & {
    options: typeof contract.options & { address: string };
  };
}
