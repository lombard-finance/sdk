import { Abi, Address } from 'viem';

import { ChainId } from './chains';

export type ContractInfo = {
  abi: Abi;
  address: Address;
  chainId: ChainId;
};
