import { Env } from '@lombard.finance/sdk-common';
import { ChainId } from '../common/chains';
import { getApiConfig } from '../common/api-config';

export type TRpcUrlConfig = Record<number, string>;

export const RPC_URL = 'https://bff.prod.lombard.finance/multi-rpc/proxy';
// export const RPC_URL = 'http://localhost:8001/multi-rpc/proxy';

export const rpcUrlConfig: TRpcUrlConfig = {
  [ChainId.ethereum]: `${RPC_URL}/eth`,
  [ChainId.base]: `${RPC_URL}/base`,
  // [ChainId.binanceSmartChain]: 'https://bsc-dataseed.bnbchain.org',
  [ChainId.binanceSmartChain]: `${RPC_URL}/bsc`,
  [ChainId.corn]: `${RPC_URL}/corn_maizenet`,
  [ChainId.katana]: `${RPC_URL}/katana`,
  [ChainId.sonic]: `${RPC_URL}/sonic_mainnet`,
  // Testnets:
  [ChainId.baseSepoliaTestnet]: `${RPC_URL}/base_sepolia`,
  [ChainId.binanceSmartChainTestnet]:
    'https://bsc-testnet-dataseed.bnbchain.org',
  [ChainId.holesky]: `${RPC_URL}/eth_holesky`,
  [ChainId.katanaTatara]: `${RPC_URL}/katana_tatara`,
  [ChainId.sepolia]: `${RPC_URL}/eth_sepolia`,
  [ChainId.sonicBlazeTestnet]: `${RPC_URL}/sonic_blaze_testnet`,
};

export function getRpcUrlConfig(env: Env) {
  const { bffApiUrl: baseUrl } = getApiConfig(env);

  const proxy = `${baseUrl}/multi-rpc/proxy`;

  return {
    [ChainId.ethereum]: `${proxy}/eth`,
    [ChainId.base]: `${proxy}/base`,
    [ChainId.binanceSmartChain]: 'https://bsc-dataseed.bnbchain.org',
    [ChainId.corn]: `${proxy}/corn_maizenet`,
    [ChainId.katana]: `${proxy}/katana`,
    [ChainId.sonic]: `${proxy}/sonic_mainnet`,
    // Testnets:
    [ChainId.baseSepoliaTestnet]: `${proxy}/base_sepolia`,
    [ChainId.binanceSmartChainTestnet]:
      'https://bsc-testnet-dataseed.bnbchain.org',
    [ChainId.holesky]: `${proxy}/eth_holesky`,
    [ChainId.katanaTatara]: `${proxy}/katana_tatara`,
    [ChainId.sepolia]: `${proxy}/eth_sepolia`,
    [ChainId.sonicBlazeTestnet]: `${proxy}/sonic_blaze_testnet`,
  } as TRpcUrlConfig;
}
