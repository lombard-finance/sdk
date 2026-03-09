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
  ibc: SolanaNetwork.devnet,
};

/**
 * Map from Solana network to environment
 */
export const networkToEnv: Record<SolanaNetwork, Env> = {
  [SolanaNetwork.mainnet]: 'prod',
  [SolanaNetwork.testnet]: 'testnet',
  [SolanaNetwork.devnet]: 'dev',
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

  /**
   * BTC.b SPL token mint address
   */
  btcbTokenMint: string | null;

  /**
   * Consortium program address
   */
  consortium: string | null;

  /**
   * Mailbox program address
   */
  mailbox: string | null;

  /**
   * Asset Router program address
   */
  assetRouter: string | null;

  /**
   * Ratio Oracle program address
   */
  ratioOracle: string | null;

  /**
   * Bridge program address
   */
  bridge: string | null;

  /**
   * Lombard Token Pool program address
   */
  lombardTokenPool: string | null;

  /**
   * Ledger chain ID (32 bytes hex) used for mailbox inbound message path derivation.
   * Matches Go claimer config `sol.ledger-chain-id`.
   */
  ledgerChainId: string | null;

  /**
   * Solana routing chain ID (32 bytes hex) — `from_chain_id` for token_route PDA derivation.
   * This identifies Solana in the Lombard cross-chain routing protocol.
   */
  solanaRoutingChainId: string | null;

  /**
   * Bitcoin routing chain ID (32 bytes hex) — `to_chain_id` for token_route PDA derivation.
   * This identifies Bitcoin in the Lombard cross-chain routing protocol.
   */
  bitcoinRoutingChainId: string | null;
}

/**
 * Configuration for devnet environment
 */
const devnetConfig: IConfig = {
  lbtcTokenMint: 'LBTCojyVJ63rsEED2DLEGWMzSxWJyQynXE91LMLgV1J',
  lbtcProgramId: 'HEY7PCJe3GB27UWdopuYb1xDbB5SNtTcYPxRjntvfBSA',
  treasuryAddress: 'ByHNGi4zPJw5StyWZoLQJ9n2wT12oupJF2pTSNKMnnAZ',
  bascule: null,
  basculeData: null,
  admin: '6MKjyWZnkSMitJYAixvJzqhJiVsjTA3hYHX8aP9qNioj',
  lzOftAdapter: 'AEFwQgaSNhQcZhAcGZGM9iTyGML3fsJC2aBvYmzV81FE',
  lzOftStore: '3SG3oyrG3KSvJ9bbxPDu7ZXEe5o1TW1QkgudkKvK6FK4',
  lzMultisig: 'GfYV1f1bR9vy41mSyQ8quxYbds121kijSBj5A3nG8oDQ',
  lzEscrow: 'GRq2yasTvWWPPqSwxCZvqfCTfDhP3MswDH4nW2v6F5To',
  btcbTokenMint: 'BTCB3ripBAut19jM8kDPVbJHb2ZdR2GcZvGZkCmFPtV8',
  consortium: 'LomCbo8K5ar4kVpqoGGktE8WemHfGz84V8aH8Y1iGxd',
  mailbox: 'LomJw912MoUd7iiAesTQAgz1paLcTqi6ndG3w3pnKH9',
  assetRouter: 'LomVyJDZ91jeVbNnTupJXKJTQFakJVMc87CmwDHYt95',
  ratioOracle: 'LomfreVHrrMrSpv54KCJ6AC1eKL8QbL1Ej28S3gwawa',
  bridge: 'Lom9Em2WzV7gvtttdub9LZSR8gLgtbzFDhFm1zMQRp6',
  lombardTokenPool: 'LomdWAg9hHyz3VrvK5wXTap7o348Ku2QJ2j2H8Etj3C',
  ledgerChainId: '031f51c4e4cc1dae1c752d2f8fe2ae045da668a13f2e47a465964d630f5ed22e',
  solanaRoutingChainId: '0259db5080fc2c6d3bcf7ca90712d3c2e5e6c28f27f0dfbb9953bdb0894c03ab',
  bitcoinRoutingChainId: 'ff000008819873e925422c1ff0f99f7cc9bbb232af63a077a480a3633bee1ef6',
};

const stageConfig: IConfig = {
  lbtcTokenMint: '1btcyoWK7d99iosES4eXQGhhooCscKGigV5wHfvzueX',
  lbtcProgramId: 'HEY7PCJe3GB27UWdopuYb1xDbB5SNtTcYPxRjntvfBSA',
  treasuryAddress: 'ByHNGi4zPJw5StyWZoLQJ9n2wT12oupJF2pTSNKMnnAZ',
  bascule: 'At7x8PtHWsJrLFLFRf6VY3eBmtCwsTFEBeKU2CzKvtvs',
  basculeData: null,
  admin: '6MKjyWZnkSMitJYAixvJzqhJiVsjTA3hYHX8aP9qNioj',
  lzOftAdapter: 'AEFwQgaSNhQcZhAcGZGM9iTyGML3fsJC2aBvYmzV81FE',
  lzOftStore: '3SG3oyrG3KSvJ9bbxPDu7ZXEe5o1TW1QkgudkKvK6FK4',
  lzMultisig: 'GfYV1f1bR9vy41mSyQ8quxYbds121kijSBj5A3nG8oDQ',
  lzEscrow: 'GRq2yasTvWWPPqSwxCZvqfCTfDhP3MswDH4nW2v6F5To',
  btcbTokenMint: 'BTCGPAHQSsS9RYcL2Z4B5z6YyAXLatNcnaEwYdczsMZw',
  consortium: 'Lom4WypiQ2pXWWXEsX1N8695hVLwG3yNqwq1YvvutVE',
  mailbox: 'Lom5doBNAny5AaPS9J7SRPLghVqwEQLrEmvQMhNEUqa',
  assetRouter: 'Lomby2CBo9czSz6jeQo73mK4fNfpF5vNz1RTW22sE8o',
  ratioOracle: 'LomMaT3jSjMiECtPrK4pLfzNQB2uMaxMqGenBbimjWq',
  bridge: 'LomS25cte2jkQoLbKembGB19gb2pMNKPFodwLHpMiWR',
  lombardTokenPool: 'LomtioA14cDhme8bCCw5oc5a9FUDyT91z8ujtGnY5g9',
  ledgerChainId:
    '03188910472e0723d1bbb01b01f0004a3cbbca1dde55b638d67172155d69f507',
  solanaRoutingChainId:
    '0259db5080fc2c6d3bcf7ca90712d3c2e5e6c28f27f0dfbb9953bdb0894c03ab',
  bitcoinRoutingChainId:
    'ff000008819873e925422c1ff0f99f7cc9bbb232af63a077a480a3633bee1ef6',
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
  btcbTokenMint: null,
  consortium: null,
  mailbox: null,
  assetRouter: null,
  ratioOracle: null,
  bridge: null,
  lombardTokenPool: null,
  ledgerChainId: '033bc7baf196ce32b8b9200518df11c35bad882fc6e3b6f45b4a8885f4c1281b',
  solanaRoutingChainId: null,
  bitcoinRoutingChainId: null,
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
  btcbTokenMint: null,
  consortium: null,
  mailbox: null,
  assetRouter: null,
  ratioOracle: null,
  bridge: null,
  lombardTokenPool: null,
  ledgerChainId: '0387b25e8e61f2ce4838b04795b231f09ee73ffd391da018bef4bc5c4975897b',
  solanaRoutingChainId: null,
  bitcoinRoutingChainId: null,
};

/**
 * Get configuration for a specific environment
 * @param env Environment
 * @returns Configuration
 */
export function getConfig(env: Env = DEFAULT_ENV): IConfig {
  switch (env) {
    case 'dev':
      return devnetConfig;
    case 'stage':
      return stageConfig;
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
    envOrNetwork === 'dev' ||
    envOrNetwork === 'ibc';

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
    envOrNetwork === 'stage' ||
    envOrNetwork === 'dev' ||
    envOrNetwork === 'ibc';

  const env = isEnv
    ? envOrNetwork
    : networkToEnv[envOrNetwork as SolanaNetwork];
  return getConfig(env).lbtcTokenMint;
}
