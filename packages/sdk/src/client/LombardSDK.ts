/**
 * Main Lombard SDK Class
 *
 * Entry point for all Lombard operations.
 *
 * @module client/LombardSDK
 */

import type { Env } from '@lombard.finance/sdk-common';
import type { WalletAuthService as IWalletAuthService } from '@lombard.finance/sdk-common';

import { BtcActions } from '../chains/btc/BtcActions';
import { EvmActions } from '../chains/evm/EvmActions';
import { SolanaActions } from '../chains/solana/SolanaActions';
import { StarknetActions } from '../chains/starknet/StarknetActions';
import { SuiActions } from '../chains/sui/SuiActions';
import type {
  AnyProvider,
  BtcProvider,
  EvmProvider,
  SolanaProvider,
  StarknetProvider,
  SuiProvider,
} from '../config/providers';
import type { ProviderGetters, ResolvedLombardConfig } from '../config/types';
import { getProviderGetter } from '../config/types';
import { CapabilityRegistry } from '../modules/CapabilityRegistry';
import { ReferralsClient } from '../referrals/ReferralsClient';
import { LombardError, ProviderErrorCode } from '../shared/errors';
import { ApiNamespace } from './ApiNamespace';
import { AssetNamespace } from './AssetNamespace';
import { PartnerConfiguration } from './PartnerConfiguration';

type ProviderType = keyof ProviderGetters;
type ProviderCache = Map<ProviderType, AnyProvider>;

/**
 * Main Lombard SDK
 *
 * Provides access to all chain actions and features.
 *
 * **Important**: Use `createLombardSDK()` to create instances.
 * Direct instantiation is not recommended.
 *
 * @example
 * ```typescript
 * // Recommended: Use the async factory
 * const sdk = await createLombardSDK({
 *   env: Env.prod,
 *   providers: {
 *     evm: (chain) => window.ethereum,
 *   },
 * });
 *
 * // Access chain actions
 * const btcStake = sdk.chain.btc.stake({
 *   assetOut: AssetId.LBTC,
 *   destChain: Chain.ETHEREUM,
 * });
 * ```
 */
export class LombardSDK<E extends Env = Env> {
  readonly config: ResolvedLombardConfig;
  readonly env: Env;

  /** Partner configuration manager */
  private partnerConfig: PartnerConfiguration;

  /** Provider cache */
  private providerCache: ProviderCache = new Map();

  /**
   * Chain actions (user-facing API)
   *
   * Access operations for each supported chain:
   * - btc: Bitcoin operations (stake, stakeAndDeploy, deposit)
   * - evm: EVM operations (deposit, stake, unstake, deploy, redeem)
   * - solana: Solana operations (unstake)
   * - sui: Sui operations (unstake)
   * - starknet: Starknet operations (unstake)
   */
  public readonly chain: {
    btc: BtcActions;
    evm: EvmActions;
    solana: SolanaActions;
    sui: SuiActions;
    starknet: StarknetActions;
  };

  public readonly assets: AssetNamespace;

  /**
   * API namespace for data-fetching operations
   *
   * Provides convenient access to Lombard API read operations:
   * - deposits: Fetch deposit history
   * - unstakes: Fetch unstake/redemption history
   * - points: Fetch Lux points
   * - exchangeRatio: Get exchange ratios for all supported tokens
   * - depositAddress: Get existing BTC deposit address
   */
  public readonly api: ApiNamespace;

  /** Feature clients */
  public readonly referrals: ReferralsClient;

  /** Capability registry (manages optional module services) */
  public readonly capabilities: CapabilityRegistry;

  /**
   * Wallet-auth service: challenge, verify, poll, revoke.
   *
   * `null` unless `walletAuthModule()` is registered, because acquiring a token
   * is optional — a consumer that only reads public data never needs one.
   *
   * An accessor rather than a `capabilities.require('walletAuth')` call at every
   * site, because that is what the module's own `@example` and the design both
   * document, and because a namespace is how every other service on this class
   * is reached.
   */
  public get walletAuth(): IWalletAuthService | null {
    // The registry is generic over the modules a caller registered, and this
    // class is not, so it cannot know statically that 'walletAuth' yields a
    // WalletAuthService. The module is the only thing that registers under that
    // id, so the assertion is safe and narrow.
    return (
      (this.capabilities.optional('walletAuth') as
        | IWalletAuthService
        | undefined) ?? null
    );
  }

  constructor(config: ResolvedLombardConfig) {
    this.config = config;
    this.env = config.env as E;

    // Initialize partner configuration
    this.partnerConfig = new PartnerConfiguration(config.partner);

    // Initialize capability registry (config-only, no SDK reference needed)
    this.capabilities = new CapabilityRegistry(
      this.config.modules,
      this.config,
    );

    // Initialize chain actions with config (not SDK)
    this.chain = {
      btc: new BtcActions(this.config),
      evm: new EvmActions(this.config),
      solana: new SolanaActions(this.config),
      sui: new SuiActions(this.config),
      starknet: new StarknetActions(this.config),
    };

    // Initialize feature clients
    this.referrals = new ReferralsClient(this);

    // Initialize asset namespace
    this.assets = new AssetNamespace(this.env);

    // Initialize API namespace
    this.api = new ApiNamespace(this.env);
  }

  /**
   * Get a provider for a specific chain type
   *
   * Providers are lazily loaded and cached.
   *
   * @param type - Provider type ('evm', 'bitcoin', etc.)
   * @returns Provider instance
   * @throws LombardError if provider not configured
   */
  async getProvider(type: 'evm'): Promise<EvmProvider>;
  async getProvider(type: 'bitcoin'): Promise<BtcProvider>;
  async getProvider(type: 'solana'): Promise<SolanaProvider>;
  async getProvider(type: 'sui'): Promise<SuiProvider>;
  async getProvider(type: 'starknet'): Promise<StarknetProvider>;
  async getProvider(type: ProviderType): Promise<AnyProvider>;
  async getProvider(type: ProviderType): Promise<AnyProvider> {
    const cacheKey = type;

    // Check cache first
    if (this.providerCache.has(cacheKey)) {
      return this.providerCache.get(cacheKey) as AnyProvider;
    }

    // Get provider getter from config using safe accessor
    const getter = getProviderGetter<AnyProvider>(this.config.providers, type);
    if (!getter) {
      throw LombardError.providerMissing(type, type);
    }

    // Call getter to get provider
    const provider = await getter();
    if (!provider) {
      throw new LombardError(
        ProviderErrorCode.PROVIDER_INITIALIZATION_FAILED,
        `Failed to initialize ${type} provider`,
      );
    }

    // Cache and return
    this.providerCache.set(cacheKey, provider);
    return provider;
  }

  /**
   * Configure partner settings
   *
   * @param config - Partner configuration
   */
  configure(config: Parameters<PartnerConfiguration['update']>[0]): void {
    this.partnerConfig.update(config);
  }

  /**
   * Register a custom asset
   *
   * TODO: Implement asset registration
   */
  registerAsset(_asset: unknown): void {
    throw new Error('Not implemented yet');
  }

  /**
   * Get partner configuration
   */
  getPartnerConfig(): PartnerConfiguration {
    return this.partnerConfig;
  }

  getPartnerId(): string | undefined {
    return this.partnerConfig.getPartnerId();
  }
}
