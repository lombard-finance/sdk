import { ChainId } from '../common/chains';

export type TRpcUrlConfig = Record<number, string>;

export const RPC_URL = 'https://bff.prod.lombard.finance/multi-rpc/proxy';

export const rpcUrlConfig: TRpcUrlConfig = {
  [ChainId.ethereum]: `${RPC_URL}/eth`,
  [ChainId.base]: `${RPC_URL}/base`,
  [ChainId.binanceSmartChain]: 'https://bsc-dataseed.bnbchain.org',
  [ChainId.corn]: `${RPC_URL}/corn_maizenet`,
  [ChainId.sonic]: `${RPC_URL}/sonic_mainnet`,
  // Testnets:
  [ChainId.baseSepoliaTestnet]: `${RPC_URL}/base_sepolia`,
  [ChainId.binanceSmartChainTestnet]:
    'https://bsc-testnet-dataseed.bnbchain.org',
  [ChainId.holesky]: `${RPC_URL}/eth_holesky`,
  [ChainId.sepolia]: `${RPC_URL}/eth_sepolia`,
  [ChainId.sonicBlazeTestnet]: `${RPC_URL}/sonic_blaze_testnet`,
};
