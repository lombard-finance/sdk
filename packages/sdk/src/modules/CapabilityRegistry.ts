/**
 * Capability Registry
 *
 * Manages optional module services and provides dependency injection for actions.
 * Works exclusively with LombardConfig, never requiring the full SDK instance.
 *
 * @module modules/CapabilityRegistry
 */

import type {
  AnyModule,
  ModuleId,
  ProviderFor,
  ProviderKey,
  RegisterContext,
  SdkModule,
  ServiceOf,
  SharedToken,
} from '@lombard.finance/sdk-common';

import type { LombardConfig } from '../config/types';
import { getProviderGetter } from '../config/types';
import { LombardError } from '../shared/errors';

/**
 * Capability Registry
 *
 * Manages optional module services (BTC, EVM, API, Solana, Sui, Starknet, etc.)
 * and provides lazy loading with descriptive error messages.
 *
 * Services are internal implementations for action DI.
 * Public APIs should call underlying functions directly for rich types.
 *
 * @example
 * ```typescript
 * const registry = new CapabilityRegistry(config.modules, config);
 * const btcService = registry.require('btc');
 * const solanaService = registry.optional('solana'); // null if not installed
 * ```
 */
export class CapabilityRegistry<
  TModules extends readonly AnyModule[] = readonly AnyModule[],
> {
  private readonly modules = new Map<string, AnyModule>();
  private readonly services = new Map<string, unknown>();
  private readonly shared = new Map<SharedToken<unknown>, unknown>();

  constructor(
    modules: readonly AnyModule[],
    private readonly config: LombardConfig,
  ) {
    modules.forEach((mod) => this.modules.set(mod.id, mod));
  }

  /**
   * Require a module service
   *
   * Throws LombardError.moduleMissing if module not installed.
   *
   * @param id - Module identifier
   * @returns Module service
   */
  require<TId extends ModuleId<TModules[number]>>(
    id: TId,
  ): ServiceOf<TModules[number] & SdkModule<TId, unknown>, TId> {
    const mod = this.modules.get(id as string);
    if (!mod) {
      throw LombardError.moduleMissing(id as string);
    }
    if (!this.services.has(mod.id)) {
      this.services.set(mod.id, mod.register(this.createContext()));
    }
    return this.services.get(mod.id) as ServiceOf<
      TModules[number] & SdkModule<TId, unknown>,
      TId
    >;
  }

  /**
   * Optionally get a module service
   *
   * Returns null if module not installed (no error thrown).
   *
   * @param id - Module identifier
   * @returns Module service or null
   */
  optional<TId extends ModuleId<TModules[number]>>(
    id: TId,
  ): ServiceOf<TModules[number] & SdkModule<TId, unknown>, TId> | null {
    const mod = this.modules.get(id as string);
    if (!mod) {
      return null;
    }
    if (!this.services.has(mod.id)) {
      this.services.set(mod.id, mod.register(this.createContext()));
    }
    return this.services.get(mod.id) as ServiceOf<
      TModules[number] & SdkModule<TId, unknown>,
      TId
    >;
  }

  /**
   * Create registration context for modules
   *
   * Provides modules with access to config-based services.
   */
  private createContext(): RegisterContext {
    return {
      env: this.config.env,
      getProvider: async <TKey extends ProviderKey>(key: TKey) => {
        const getter = getProviderGetter(this.config.providers, key);
        if (!getter) {
          return undefined as unknown as ProviderFor<TKey>;
        }
        return (await getter()) as ProviderFor<TKey>;
      },
      getShared: <T>(token: SharedToken<T>) =>
        this.shared.get(token as SharedToken<unknown>) as T | undefined,
      setShared: <T>(token: SharedToken<T>, value: T) => {
        this.shared.set(token as SharedToken<unknown>, value);
      },
    };
  }
}
