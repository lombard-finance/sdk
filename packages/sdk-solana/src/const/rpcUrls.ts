import { Commitment, Connection } from '@solana/web3.js';

import { SolanaNetwork } from '../types/network';

// TODO: Get this from the sdk
export const BFF_BASE_URL_PROD =
  'https://bff.prod.lombard-fi.com/multi-rpc/proxy';
export const BFF_BASE_URL_STAGE =
  'https://bff.stage.lombard-fi.com/multi-rpc/proxy';
export const BFF_WS_URL_PROD = 'wss://bff.prod.lombard-fi.com/multi-rpc/proxy';
export const BFF_WS_URL_STAGE =
  'wss://bff.stage.lombard-fi.com/multi-rpc/proxy';

export const RPC_URLS: Record<SolanaNetwork, string> = {
  [SolanaNetwork.mainnet]: `${BFF_BASE_URL_PROD}/solana`,
  [SolanaNetwork.testnet]: 'https://api.testnet.solana.com',
  [SolanaNetwork.devnet]: `${BFF_BASE_URL_PROD}/solana_devnet`,
};

export const WS_URLS: Record<SolanaNetwork, string> = {
  [SolanaNetwork.mainnet]: `${BFF_WS_URL_PROD}?chain=solana`,
  [SolanaNetwork.testnet]: 'wss://api.testnet.solana.com',
  [SolanaNetwork.devnet]: `${BFF_BASE_URL_PROD}?chain=solana_devnet`,
};

export const getRpcUrl = (network: SolanaNetwork) => {
  return RPC_URLS[network];
};

export const getConnection = (network: SolanaNetwork, rpcUrl?: string) => {
  return new Connection(rpcUrl || RPC_URLS[network], {
    commitment: 'confirmed',
    wsEndpoint: WS_URLS[network],
  });
};

/**
 * Default Solana network to use
 */
export const DEFAULT_NETWORK: SolanaNetwork = 'mainnet-beta';

/**
 * Default commitment level for Solana transactions
 */
export const DEFAULT_COMMITMENT: Commitment = 'confirmed';
