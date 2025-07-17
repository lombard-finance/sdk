import { Env } from '@lombard.finance/sdk-common';
import { SolanaNetwork } from '../types';
import { RPC_URLS } from './rpcUrls';

/**
 * Default environment
 */
export const DEFAULT_ENV: Env = 'prod';

/**
 * Map from environment to Solana network
 */
export const envToNetwork: Record<Env, SolanaNetwork> = {
  prod: SolanaNetwork.mainnet,
  testnet: SolanaNetwork.testnet,
  stage: SolanaNetwork.devnet,
  dev: SolanaNetwork.devnet,
};

/**
 * Map from Solana network to environment
 */
export const networkToEnv: Record<SolanaNetwork, Env> = {
  [SolanaNetwork.mainnet]: 'prod',
  [SolanaNetwork.testnet]: 'testnet',
  [SolanaNetwork.devnet]: 'stage',
};

/**
 * Configuration interface
 */
export interface IConfig {
  /**
   * LBTC token mint address
   */
  lbtcTokenMint: string;

  /**
   * Program ID for the LBTC operations
   */
  lbtcProgramId: string;

  /**
   * Treasury address for LBTC operations
   */
  treasuryAddress: string;

  /**
   * Bascule address for LBTC operations
   */
  bascule: string | null;

  /**
   * Bascule data for LBTC operations
   */
  basculeData: string | null;

  /**
   * Admin address for LBTC operations
   */
  admin: string;

  /**
   * LZ OFT adapter address for LBTC operations
   */
  lzOftAdapter: string;

  /**
   * LZ OFT store address for LBTC operations
   */
  lzOftStore: string;

  /**
   * LZ Multisig address for LBTC operations
   */
  lzMultisig: string;

  /**
   * LZ Escrow address for LBTC operations
   */
  lzEscrow: string;
}

/**
 * Configuration for devnet environment
 */
const devnetConfig: IConfig = {
  lbtcTokenMint: '1btcyoWK7d99iosES4eXQGhhooCscKGigV5wHfvzueX',
  lbtcProgramId: 'HEY7PCJe3GB27UWdopuYb1xDbB5SNtTcYPxRjntvfBSA',
  treasuryAddress: 'ByHNGi4zPJw5StyWZoLQJ9n2wT12oupJF2pTSNKMnnAZ',
  bascule: null,
  basculeData: null,
  admin: '6MKjyWZnkSMitJYAixvJzqhJiVsjTA3hYHX8aP9qNioj',
  lzOftAdapter: 'AEFwQgaSNhQcZhAcGZGM9iTyGML3fsJC2aBvYmzV81FE',
  lzOftStore: '3SG3oyrG3KSvJ9bbxPDu7ZXEe5o1TW1QkgudkKvK6FK4',
  lzMultisig: 'GfYV1f1bR9vy41mSyQ8quxYbds121kijSBj5A3nG8oDQ',
  lzEscrow: 'GRq2yasTvWWPPqSwxCZvqfCTfDhP3MswDH4nW2v6F5To',
};

/**
 * Configuration for testnet environment
 */
const testnetConfig: IConfig = {
  lbtcTokenMint: '1BTCPX3qyFtBvhQvJaHntfzZfB8qcJmJXfoRnD3vAgh',
  lbtcProgramId: '79cscM6J9Af24TGGWcXyDf56fDLoodkyXdVy4R9aZ6C6',
  treasuryAddress: 'ASsctcXoo2kjbxpVJKMV3tu6Fe9725fvyWF5hUeiNYDT',
  bascule: null,
  basculeData: null,
  admin: '6MKjyWZnkSMitJYAixvJzqhJiVsjTA3hYHX8aP9qNioj',
  lzOftAdapter: '7AwaQPN3Sh3qHo2j44nvwmNgPS9FhDDbBcUXAdi12pk1',
  lzOftStore: '8YN34wKaAc34BwFKxnUqQeRwWmfhbs4vYw2rnz2Z89sp',
  lzMultisig: 'J3XK1JJTF6udknuLb15oUQhYbooUFiafhNxwYHAMxXE1',
  lzEscrow: '8aNceYRuD5PR51o2pBnhw9cCktByixMPySUJrP3FexzA',
};

/**
 * Configuration for production environment
 */
const prodConfig: IConfig = {
  lbtcTokenMint: 'LBTCgU4b3wsFKsPwBn1rRZDx5DoFutM6RPiEt1TPDsY',
  lbtcProgramId: 'LomP48F7bLbKyMRHHsDVt7wuHaUQvQnVVspjcbfuAek',
  treasuryAddress: '4qKkExZ4T5yyVumc4qoTzoa8fwmhpDy2Zg9ZUoNwzSP9',
  bascule: 'E1p8P6TTe8QvKmSK7QZ3n7HtQY9hE1p9JrCwLrXnPUfn',
  basculeData: 'BqScmyjmK7f3sxvPk4f4ikUHAKT4AYUKMjp8edSQURZb',
  admin: 'HzCyQqcAoxAHeqHAWH1RQbfw7GNUzinqSWideGj7ZtEE',
  lzOftAdapter: '7QkBVz37mjevzKYJDcVy6xKDG1hUewWgj51Dehgcu5sM',
  lzOftStore: 'CQeKmXxoGog57U5jPyYz7YAo8AuLUdoDqxGTXtMPkMuc',
  lzMultisig: '2YB3LPB4Tdb1ccmEFqhK3ZEKLFzCPayUwzEU5J1DXSzK',
  lzEscrow: '6nc7pBpN82EeKFbcqRt7xVV2h8FNQGdiVnTb2TQvyv99',
};

/**
 * Get configuration for a specific environment
 * @param env Environment
 * @returns Configuration
 */
export function getConfig(env: Env = DEFAULT_ENV): IConfig {
  switch (env) {
    case 'stage':
      return devnetConfig;
    case 'testnet':
      return testnetConfig;
    default:
      return prodConfig;
  }
}

/**
 * Get the RPC endpoint for a specific environment or network
 * @param envOrNetwork Environment or SolanaNetwork
 * @returns RPC endpoint
 */
export function getRpcEndpoint(env: Env): string;
export function getRpcEndpoint(network: SolanaNetwork): string;
export function getRpcEndpoint(envOrNetwork: Env | SolanaNetwork): string {
  const isEnv =
    envOrNetwork === 'prod' ||
    envOrNetwork === 'testnet' ||
    envOrNetwork === 'stage' ||
    envOrNetwork === 'dev';

  const network = isEnv ? envToNetwork[envOrNetwork] : envOrNetwork;
  return RPC_URLS[network];
}

/**
 * Get the LBTC token address for a specific environment
 * @param env Environment
 * @returns LBTC token address
 */
export function getLBTCAddress(env: Env): string;
export function getLBTCAddress(network: SolanaNetwork): string;
export function getLBTCAddress(envOrNetwork: Env | SolanaNetwork): string {
  const isEnv =
    envOrNetwork === 'prod' ||
    envOrNetwork === 'testnet' ||
    envOrNetwork === 'stage';

  const env = isEnv
    ? envOrNetwork
    : networkToEnv[envOrNetwork as SolanaNetwork];
  return getConfig(env).lbtcTokenMint;
}
