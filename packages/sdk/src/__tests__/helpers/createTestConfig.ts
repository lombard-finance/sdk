/**
 * Test Configuration Helper
 *
 * Provides a synchronous config creation for tests.
 * Uses bundled catalog directly to avoid async in test setup.
 *
 * @module __tests__/helpers/createTestConfig
 */

import type { AnyModule, ProviderKey } from '@lombard.finance/sdk-common';

import type {
  CreateConfigOptions,
  ResolvedLombardConfig,
} from '../../config/types';
import { ASSET_CATALOG } from '../../core/assets/catalog';
import { apiModule } from '../../modules/apiModule';
import { btcModule } from '../../modules/btcModule';
import { evmModule } from '../../modules/evmModule';
import { LombardError } from '../../shared/errors';

function mergeModules(provided: readonly AnyModule[] | undefined): AnyModule[] {
  const modules = new Map<string, AnyModule>();
  const builtIns: AnyModule[] = [btcModule(), evmModule(), apiModule()];
  for (const mod of builtIns) {
    modules.set(mod.id, mod);
  }
  if (provided) {
    for (const mod of provided) {
      modules.set(mod.id, mod);
    }
  }
  return Array.from(modules.values());
}

function hasProvider(
  config: Pick<ResolvedLombardConfig, 'providers'>,
  key: ProviderKey,
): boolean {
  return Boolean(config.providers?.[key]);
}

function ensureProviders(
  modules: readonly AnyModule[],
  config: Pick<ResolvedLombardConfig, 'providers'>,
): void {
  for (const mod of modules) {
    for (const key of mod.requiresProviders ?? []) {
      if (!hasProvider(config, key)) {
        throw LombardError.providerMissing(key, key);
      }
    }
  }
}

/**
 * Create SDK config synchronously for tests
 *
 * This creates a ResolvedLombardConfig with the bundled catalog directly.
 * Only use this in tests - production code should use createLombardSDK().
 *
 * @param options - Configuration options
 * @returns ResolvedLombardConfig with bundled catalog
 */
export function createTestConfig(
  options: CreateConfigOptions,
): ResolvedLombardConfig {
  if (!options.env) {
    throw LombardError.missingParameter('env');
  }

  const modules = mergeModules(
    options.modules as readonly AnyModule[] | undefined,
  );

  const config: ResolvedLombardConfig = {
    env: options.env,
    providers: options.providers || {},
    modules,
    catalog: ASSET_CATALOG,
  };

  if (options.partner) {
    config.partner = options.partner;
  }

  ensureProviders(modules, config);

  return config;
}
