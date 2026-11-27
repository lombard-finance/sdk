import { Env } from '@lombard.finance/sdk-common';
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

const NETWORK_CHAIN_SEGMENT: Record<SolanaNetwork, string> = {
  [SolanaNetwork.mainnet]: 'solana',
  [SolanaNetwork.testnet]: 'solana_testnet',
  [SolanaNetwork.devnet]: 'solana_devnet',
};

const isProdEnv = (env?: Env): boolean => env === 'prod';

const getBffBaseUrl = (env?: Env): string =>
  isProdEnv(env) ? BFF_BASE_URL_PROD : BFF_BASE_URL_STAGE;

const getBffWsUrl = (env?: Env): string =>
  isProdEnv(env) ? BFF_WS_URL_PROD : BFF_WS_URL_STAGE;

/**
 * Default RPC URL map. Kept for backwards compatibility (Storybook, etc.).
 * For env-aware URL resolution use {@link getRpcUrl} or {@link getConnection}.
 */
export const RPC_URLS: Record<SolanaNetwork, string> = {
  [SolanaNetwork.mainnet]: `${BFF_BASE_URL_PROD}/solana`,
  [SolanaNetwork.testnet]: 'https://api.testnet.solana.com',
  [SolanaNetwork.devnet]: `${BFF_BASE_URL_STAGE}/solana_devnet`,
};

/**
 * Default WebSocket URL map. Kept for backwards compatibility.
 * For env-aware URL resolution use {@link getWsUrl} or {@link getConnection}.
 */
export const WS_URLS: Record<SolanaNetwork, string> = {
  [SolanaNetwork.mainnet]: `${BFF_WS_URL_PROD}?chain=solana`,
  [SolanaNetwork.testnet]: 'wss://api.testnet.solana.com',
  [SolanaNetwork.devnet]: `${BFF_WS_URL_STAGE}?chain=solana_devnet`,
};

/**
 * Returns the BFF-proxied RPC URL for a Solana network. When `env` is
 * provided, the BFF host is selected accordingly (`prod` → bff.prod,
 * any other env → bff.stage). Public endpoints (testnet) are returned as-is.
 */
export const getRpcUrl = (network: SolanaNetwork, env?: Env): string => {
  if (network === SolanaNetwork.testnet) {
    return RPC_URLS[network];
  }
  return `${getBffBaseUrl(env)}/${NETWORK_CHAIN_SEGMENT[network]}`;
};

/**
 * Returns the BFF-proxied WebSocket URL for a Solana network. Same env
 * selection rules as {@link getRpcUrl}.
 */
export const getWsUrl = (network: SolanaNetwork, env?: Env): string => {
  if (network === SolanaNetwork.testnet) {
    return WS_URLS[network];
  }
  return `${getBffWsUrl(env)}?chain=${NETWORK_CHAIN_SEGMENT[network]}`;
};

export const getConnection = (
  network: SolanaNetwork,
  rpcUrl?: string,
  env?: Env,
) => {
  return new Connection(rpcUrl || getRpcUrl(network, env), {
    commitment: 'confirmed',
    wsEndpoint: getWsUrl(network, env),
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
