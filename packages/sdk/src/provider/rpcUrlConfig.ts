import { OChainId } from '../common/types/types';

export type TRpcUrlConfig = Record<number, string>;

export const RPC_URL = 'https://bff.prod.lombard.finance/multi-rpc/proxy';

export const rpcUrlConfig: TRpcUrlConfig = {
  [OChainId.ethereum]: `${RPC_URL}/eth`,
  [OChainId.holesky]: `${RPC_URL}/eth_holesky`,
  [OChainId.sepolia]: `${RPC_URL}/eth_sepolia`,
  [OChainId.base]: `${RPC_URL}/base`,
  [OChainId.baseSepoliaTestnet]: `${RPC_URL}/base_sepolia`,
  [OChainId.binanceSmartChain]: 'https://bsc-dataseed.bnbchain.org',
  [OChainId.binanceSmartChainTestnet]:
    'https://bsc-testnet-dataseed.bnbchain.org',
  [OChainId.corn]: `${RPC_URL}/corn_maizenet`,
};
