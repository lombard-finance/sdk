/**
 * Strategy Context Types
 *
 * Defines the lightweight context objects passed to strategies instead of the full SDK.
 * This improves testability, reduces coupling, and makes dependencies explicit.
 *
 * Architecture:
 * - CoreContext = What ALL strategies of a source chain need (env, partner, chain service)
 * - Destination = What strategies need for their destination chain (injected by namespace)
 */

import type {
  ApiService,
  BtcService,
  Env,
  EvmService,
  SolanaService,
  StarknetService,
  SuiService } from '@lombard.finance/sdk-common';
// Note: EvmService is still imported for EvmCoreContext and EvmDestination
import type { EIP1193Provider } from 'viem';

import type { PartnerConfiguration } from '../../client/PartnerConfiguration';
import type { CapabilityRegistry } from '../../modules/CapabilityRegistry';

// ============ Logger ============

/**
 * Logger interface for strategy operations
 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

// ============ Provider Resolution ============

/**
 * Provider key for chain-specific wallet providers
 */
export type ProviderKey = 'bitcoin' | 'evm' | 'solana' | 'sui' | 'starknet';

/**
 * Provider resolver function
 * Lazily resolves chain-specific wallet providers
 */
export type ProviderResolver = (
  key: ProviderKey,
) => Promise<EIP1193Provider | unknown>;

// ============ Core Contexts (Source Chain) ============

/**
 * Base Core Context
 *
 * Minimal context shared by ALL strategies, regardless of chain.
 * Contains only environment, partner config, and provider resolution.
 *
 * TODO (v4.1): Add `catalog: AssetCatalog` field for remote catalog support.
 * See: docs/ADDRESS_SYSTEM_UNIFICATION.md
 */
export interface CoreContext {
  readonly env: Env;
  readonly partner: PartnerConfiguration;
  readonly getProvider: ProviderResolver;
  readonly logger?: Logger;
  // TODO (v4.1): readonly catalog: AssetCatalog;
}

/**
 * BTC Core Context
 *
 * What ALL Bitcoin strategies need (source chain operations).
 * Includes BTC service, API service, and capabilities registry.
 *
 * Note: Chain-specific destination services (EVM, Solana, etc.) are accessed
 * via capabilities.require('evm') when needed by chain configs.
 */
export interface BtcCoreContext extends CoreContext {
  readonly btc: BtcService;
  readonly api: ApiService;
  readonly capabilities: CapabilityRegistry;
}

/**
 * EVM Core Context
 *
 * What ALL EVM strategies need (source chain operations).
 */
export interface EvmCoreContext extends CoreContext {
  readonly evm: EvmService;
}

/**
 * Solana Core Context
 *
 * What ALL Solana strategies need (source chain operations).
 */
export interface SolanaCoreContext extends CoreContext {
  readonly solana: SolanaService;
}

/**
 * Sui Core Context
 *
 * What ALL Sui strategies need (source chain operations).
 */
export interface SuiCoreContext extends CoreContext {
  readonly sui: SuiService;
}

/**
 * Starknet Core Context
 *
 * What ALL Starknet strategies need (source chain operations).
 */
export interface StarknetCoreContext extends CoreContext {
  readonly starknet: StarknetService;
}

// ============ Destination Services (Injected per-strategy) ============

/**
 * EVM as destination chain
 * Injected into strategies that mint/send to EVM chains
 */
export interface EvmDestination {
  readonly evm: EvmService;
}

/**
 * Solana as destination chain
 * Injected into strategies that mint/send to Solana
 */
export interface SolanaDestination {
  readonly solana: SolanaService;
}

/**
 * Sui as destination chain
 * Injected into strategies that mint/send to Sui
 */
export interface SuiDestination {
  readonly sui: SuiService;
}

/**
 * Starknet as destination chain
 * Injected into strategies that mint/send to Starknet
 */
export interface StarknetDestination {
  readonly starknet: StarknetService;
}
