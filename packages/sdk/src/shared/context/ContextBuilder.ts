/**
 * Context Builder
 *
 * Builds lightweight action contexts from LombardConfig.
 * Contexts are passed to actions instead of the full SDK instance,
 * improving testability and reducing coupling.
 *
 * NOTE: All context creation now works from config only.
 * The SDK class should pass this.config when creating actions.
 *
 * @module shared/context/ContextBuilder
 */

import type {
  ApiService,
  BtcService,
  EvmService,
  ProviderKey } from '@lombard.finance/sdk-common';

import { PartnerConfiguration } from '../../client/PartnerConfiguration';
// Note: EvmService is imported for createEvmCoreContext
import type { LombardConfig } from '../../config/types';
import { getProviderGetter } from '../../config/types';
import { CapabilityRegistry } from '../../modules/CapabilityRegistry';
import type {
  BtcCoreContext,
  CoreContext,
  EvmCoreContext,
  ProviderResolver } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Provider Resolution
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a provider resolver from config
 */
function createProviderResolver(config: LombardConfig): ProviderResolver {
  return async key => {
    const getter = getProviderGetter(config.providers, key as ProviderKey);
    if (!getter) {
      return undefined;
    }
    return getter();
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Capability Registry Cache
// ═══════════════════════════════════════════════════════════════════════════

// Cache capability registries by config to avoid recreating them
const registryCache = new WeakMap<LombardConfig, CapabilityRegistry>();

/**
 * Get or create capability registry from config
 * @internal
 */
function getCapabilityRegistry(config: LombardConfig): CapabilityRegistry {
  let registry = registryCache.get(config);
  if (!registry) {
    registry = new CapabilityRegistry(config.modules, config);
    registryCache.set(config, registry);
  }
  return registry;
}

// ═══════════════════════════════════════════════════════════════════════════
// Context Factories
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create core context from config
 * @internal
 */
function createCoreContext(config: LombardConfig): CoreContext {
  return {
    env: config.env,
    partner: new PartnerConfiguration(config.partner),
    getProvider: createProviderResolver(config),
    logger: undefined };
}

/**
 * Create BTC core context from config
 *
 * Used by BtcActions and BTC factory functions.
 *
 * @example
 * ```typescript
 * // In BtcActions
 * constructor(config: LombardConfig) {
 *   this.ctx = createBtcCoreContext(config);
 * }
 *
 * // Or directly for factory functions
 * const stake = btcStake(config, params);
 * ```
 */
export function createBtcCoreContext(config: LombardConfig): BtcCoreContext {
  const baseContext = createCoreContext(config);
  const registry = getCapabilityRegistry(config);

  // Type assertions needed because registry doesn't know module types at compile time
  const btc = registry.require('btc') as BtcService;
  const api = registry.require('api') as ApiService;

  return {
    ...baseContext,
    btc,
    api,
    capabilities: registry };
}

/**
 * Create EVM core context from config
 *
 * Used by EvmActions and EVM factory functions.
 */
export function createEvmCoreContext(config: LombardConfig): EvmCoreContext {
  const baseContext = createCoreContext(config);
  const registry = getCapabilityRegistry(config);

  // Type assertion needed because registry doesn't know module types at compile time
  const evm = registry.require('evm') as EvmService;

  return {
    ...baseContext,
    evm };
}

// ═══════════════════════════════════════════════════════════════════════════
// Legacy Exports (for backward compatibility during migration)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @deprecated Use createBtcCoreContext(config) instead
 */
export const createBtcCoreContextFromConfig = createBtcCoreContext;

/**
 * @deprecated Use createEvmCoreContext(config) instead
 */
export const createEvmCoreContextFromConfig = createEvmCoreContext;
