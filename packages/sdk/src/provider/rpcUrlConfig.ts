import { OChainId } from '../common/types/types';

export type TRpcUrlConfig = Record<number, string>;

export const rpcUrlConfig: TRpcUrlConfig = {
  [OChainId.ethereum]: 'https://rpc.ankr.com/eth',
  [OChainId.holesky]: 'https://rpc.ankr.com/eth_holesky',
};
