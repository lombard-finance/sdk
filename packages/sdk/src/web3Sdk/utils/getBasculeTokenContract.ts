import { Provider } from '../../provider';
import { BASCULE_ABI } from '../abi';

export function getBasculeTokenContract(
  provider: Provider,
  contractAddress: string,
) {
  if (!contractAddress) {
    throw new Error('The address for bascule module is not defined');
  }

  const contract = provider.createContract(BASCULE_ABI, contractAddress);

  if (!contract.options.address) {
    contract.options.address = contractAddress;
  }

  return contract as typeof contract & {
    options: typeof contract.options & { address: string };
  };
}
