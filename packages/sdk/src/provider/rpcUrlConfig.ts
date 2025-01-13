import { OChainId } from '../common/types/types';

export type TRpcUrlConfig = Record<number, string>;

export const rpcUrlConfig: TRpcUrlConfig = {
  [OChainId.ethereum]: 'https://rpc.ankr.com/eth',
  [OChainId.holesky]: 'https://rpc.ankr.com/eth_holesky',
  [OChainId.sepolia]: 'https://rpc.ankr.com/eth_sepolia',
  [OChainId.base]: 'https://rpc.ankr.com/base',
  [OChainId.baseSepoliaTestnet]: 'https://rpc.ankr.com/base_sepolia',
  [OChainId.binanceSmartChain]: 'https://rpc.ankr.com/bsc',
  [OChainId.binanceSmartChainTestnet]:
    'https://rpc.ankr.com/bsc_testnet_chapel',
};
