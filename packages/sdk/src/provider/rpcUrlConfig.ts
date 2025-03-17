import { OChainId } from '../common/types/types';

export type TRpcUrlConfig = Record<number, string>;

export const rpcUrlConfig: TRpcUrlConfig = {
  [OChainId.ethereum]: 'https://rpc.ankr.com/eth',
  [OChainId.holesky]: 'https://rpc.ankr.com/eth_holesky',
  [OChainId.sepolia]: 'https://rpc.ankr.com/eth_sepolia',
  [OChainId.base]: 'https://rpc.ankr.com/base',
  [OChainId.baseSepoliaTestnet]: 'https://rpc.ankr.com/base_sepolia',
  [OChainId.binanceSmartChain]: 'https://bsc-dataseed.bnbchain.org',
  [OChainId.binanceSmartChainTestnet]:
    'https://bsc-testnet-dataseed.bnbchain.org',
  [OChainId.corn]: 'https://rpc.ankr.com/corn_maizenet',
};
