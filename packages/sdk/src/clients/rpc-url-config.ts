import { Env } from '@lombard.finance/sdk-common';

import { getApiConfig } from '../common/api-config';
import { ChainId } from '../common/chains';

export type TRpcUrlConfig = Record<number, string>;

export const RPC_URL = 'https://bff.prod.lombard-fi.com/multi-rpc/proxy';
// export const RPC_URL = 'http://localhost:8001/multi-rpc/proxy';

export const rpcUrlConfig: TRpcUrlConfig = {
  [ChainId.ethereum]: `${RPC_URL}/eth`,
  [ChainId.base]: `${RPC_URL}/base`,
  // [ChainId.binanceSmartChain]: 'https://bsc-dataseed.bnbchain.org',
  [ChainId.binanceSmartChain]: `${RPC_URL}/bsc`,
  [ChainId.corn]: `${RPC_URL}/corn_maizenet`,
  [ChainId.katana]: `${RPC_URL}/katana`,
  [ChainId.megaeth]:
    'https://alpha.megaeth.com/rpc?user=lombard+v1&token=1763427229-%2Bx6HFUDu9OhJwV%2FTCFOL0xTt%2FPJRAXPeirIcuytvnes%3D',
  [ChainId.sonic]: `${RPC_URL}/sonic_mainnet`,
  [ChainId.stable]:
    'https://partners-rpc.stable.xyz/lombard.075830647a2c30190712a9d102011ffe5a2a01d24ff3405f711d6ea8aca10baf', // TODO: Update with the correct RPC URL once the stable network is live
  [ChainId.tac]: `${RPC_URL}/tac`,
  [ChainId.monad]: `${RPC_URL}/monad_mainnet`,
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
    [ChainId.tac]: `${proxy}/tac`,
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
