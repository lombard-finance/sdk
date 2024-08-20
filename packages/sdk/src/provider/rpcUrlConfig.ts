import { OChainId } from '../common/types/types';

export type TRpcUrlConfig = Record<number, string>;

export const rpcUrlConfig: TRpcUrlConfig = {
  [OChainId.ethereum]: 'https://eth.llamarpc.com',
  [OChainId.holesky]: 'https://ethereum-holesky-rpc.publicnode.com',
};
