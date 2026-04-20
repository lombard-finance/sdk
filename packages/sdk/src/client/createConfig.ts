import type { AnyModule, ProviderKey } from '@lombard.finance/sdk-common';

import type { CreateConfigOptions, LombardConfig } from '../config/types';
import { validateAndApplyDefaults } from '../config/validation';
import { apiModule } from '../modules/apiModule';
import { btcModule } from '../modules/btcModule';
import { evmModule } from '../modules/evmModule';
import { LombardError } from '../shared/errors';
import { createConsoleLogger } from '../utils/consoleLogger';

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

function ensureProviders(
  modules: readonly AnyModule[],
  config: Pick<LombardConfig, 'providers'>,
): void {
  for (const mod of modules) {
    for (const key of mod.requiresProviders ?? []) {
      if (!hasProvider(config, key)) {
        throw LombardError.providerMissing(key, key);
      }
    }
  }
}

function hasProvider(
  config: Pick<LombardConfig, 'providers'>,
  key: ProviderKey,
): boolean {
  return Boolean(config.providers?.[key]);
}

/**
 * Create SDK configuration
 *
 * This is a **synchronous** function that validates options and returns
 * a configuration object. The config can be exported from a module and
 * passed around as a plain object.
 *
 * The asset catalog is NOT fetched here - it's fetched asynchronously
 * when createLombardSDK() is called. This keeps config creation simple
 * and predictable.
 *
 * @param options - Configuration options
 * @returns Validated SDK configuration
 *
 * @example
 * ```typescript
 * // lib/lombard.ts - Config is sync, can be exported directly
 * export const config = createConfig({
 *   env: Env.prod,
 *   providers: { evm: () => window.ethereum },
 * });
 *
 * // Usage - SDK creation is async
 * import { config } from './lib/lombard';
 * const sdk = await createLombardSDK(config);
 * ```
 */
export function createConfig(options: CreateConfigOptions): LombardConfig {
  const normalized = validateAndApplyDefaults(options);
  const modules = mergeModules(
    options.modules as readonly AnyModule[] | undefined,
  );
  ensureProviders(modules, normalized);

  // Resolve logger: explicit logger > debug mode > undefined
  let logger = options.logger;
  if (!logger && options.debug) {
    logger = createConsoleLogger({ level: 'debug' });
  }

  return {
    ...normalized,
    modules,
    logger,
  };
}
