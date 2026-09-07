/**
 * DeFi Stake & Bake Registry
 *
 * Provides a strongly typed registry of staking integrations so that
 * protocol/token/env/chain support is declarative and composable.
 */

import { Env } from '@lombard.finance/sdk-common';
import { Abi } from 'viem';

import { ChainId } from '../common/chains';
import { ContractInfo } from '../common/contract-info';
import { AssetId } from '../core/assets';
import { Token } from '../tokens/token-addresses';
import { SILO_VAULT_SPENDER_ABI } from '../vaults/abi';
import {
  EARN_STAKE_AND_BAKE_CHAINS,
  EARN_VAULT_SPENDER_CONTRACTS,
  EarnStakeAndBakeChain,
} from '../vaults/lib/config';

/**
 * Approval mode for stake and bake operations.
 * - `permit`: Off-chain EIP-2612 signature (gasless for user, backend pays gas)
 * - `approve`: On-chain ERC-20 approval transaction (user pays gas)
 */
export type ApprovalMode = 'permit' | 'approve';

export type StakeAndBakeAmountStrategy = 'identity' | 'btcToLbtc';
export type StakeAndBakeDeadlineStrategy = 'expiry' | 'zero';
export type StakeAndBakeNonceStrategy = 'chain' | 'skip';

export interface StakeAndBakeStrategyConfig {
  amountStrategy: StakeAndBakeAmountStrategy;
  approval: {
    mode: ApprovalMode;
    domainName: string;
    domainVersion: string;
    deadlineStrategy: StakeAndBakeDeadlineStrategy;
    nonceStrategy: StakeAndBakeNonceStrategy;
  };
  spenderContract: ContractInfo;
}

export interface StakeAndBakeStrategy extends StakeAndBakeStrategyConfig {
  protocol: DefiProtocol;
  token: StakeAndBakeToken;
  env: Env;
  chainId: ChainId;
}

type ChainStrategyMap = Partial<Record<ChainId, StakeAndBakeStrategyConfig>>;
type EnvStrategyMap = Partial<Record<Env, ChainStrategyMap>>;
type TokenStrategyMap = Partial<Record<StakeAndBakeToken, EnvStrategyMap>>;
export type StakeAndBakeRegistry = Record<DefiProtocol, TokenStrategyMap>;

const ALL_ENVS = Object.values(Env) as Env[];

// Use single source of truth from vaults/lib/config.ts
// EARN_STAKE_AND_BAKE_CHAINS is imported and used directly below

export const SILO_VAULT_SPENDER_CONTRACT_GASTALD_FUJI: `0x${string}` =
  '0xFe1e76D9e065e879A9D1914482f0F13d85F39877';

function mapChains<const C extends readonly ChainId[]>(
  chains: C,
  factory: (chain: C[number]) => StakeAndBakeStrategyConfig,
): ChainStrategyMap {
  return chains.reduce<ChainStrategyMap>((acc, chain) => {
    acc[chain] = factory(chain);
    return acc;
  }, {} as ChainStrategyMap);
}

function mapEnvs<const E extends readonly Env[]>(
  envs: E,
  factory: (env: E[number]) => ChainStrategyMap,
): EnvStrategyMap {
  return envs.reduce<EnvStrategyMap>((acc, env) => {
    acc[env] = factory(env);
    return acc;
  }, {} as EnvStrategyMap);
}

function getBitcoinEarnSpenderContract(
  chainId: EarnStakeAndBakeChain,
): ContractInfo {
  const contract = EARN_VAULT_SPENDER_CONTRACTS[chainId];
  if (!contract) {
    throw new Error(
      `Missing Bitcoin Earn spender contract for chain ${chainId}`,
    );
  }
  return contract;
}

const _DefiRegistryTokens = {
  LBTC: Token.LBTC,
  BTCb: Token.BTCb,
  BTC: 'BTC',
} as const;

export type DefiRegistryToken =
  (typeof _DefiRegistryTokens)[keyof typeof _DefiRegistryTokens];

/**
 * DeFi Protocol identifiers - SINGLE SOURCE OF TRUTH
 *
 * These are the canonical protocol identifiers used throughout the SDK.
 * All other protocol references should use these values.
 */
export const DefiProtocol = {
  BitcoinEarn: 'bitcoinEarn',
  Silo: 'silo',
} as const;

export type DefiProtocol = (typeof DefiProtocol)[keyof typeof DefiProtocol];

export const DefiProtocols = {
  [DefiProtocol.BitcoinEarn]: {
    name: 'Bitcoin Earn',
    url: 'https://lombard.finance',
  },
  [DefiProtocol.Silo]: {
    name: 'Silo Finance Vault',
    url: 'https://silo.finance',
  },
} as const;

const BITCOIN_EARN_LBTC_PERMIT_APPROVAL: StakeAndBakeStrategyConfig['approval'] =
  {
    mode: 'permit',
    domainName: 'Lombard Staked Bitcoin',
    domainVersion: '1',
    deadlineStrategy: 'expiry',
    nonceStrategy: 'chain',
  };

const SILO_BTCB_APPROVE_APPROVAL: StakeAndBakeStrategyConfig['approval'] = {
  mode: 'approve',
  domainName: 'Bitcoin',
  domainVersion: '1',
  deadlineStrategy: 'zero',
  nonceStrategy: 'skip',
};

/**
 * DeFi Registry: Token approval configurations by vault, token, env, and chain.
 *
 * TODO: Update the format of this registry to match asset catalog and chain catalog
 */
export const DEFI_REGISTRY: StakeAndBakeRegistry = {
  [DefiProtocol.BitcoinEarn]: {
    [Token.LBTC]: mapEnvs(ALL_ENVS, () =>
      mapChains(EARN_STAKE_AND_BAKE_CHAINS, (chain) => ({
        amountStrategy: 'identity',
        approval: { ...BITCOIN_EARN_LBTC_PERMIT_APPROVAL },
        spenderContract: getBitcoinEarnSpenderContract(chain),
      })),
    ),
    BTC: mapEnvs(ALL_ENVS, () =>
      mapChains(EARN_STAKE_AND_BAKE_CHAINS, (chain) => ({
        amountStrategy: 'btcToLbtc',
        approval: { ...BITCOIN_EARN_LBTC_PERMIT_APPROVAL },
        spenderContract: getBitcoinEarnSpenderContract(chain),
      })),
    ),
  },
  [DefiProtocol.Silo]: {
    [Token.BTCb]: {
      // Silo on Avalanche Fuji is only available on testnet (Gastald backend)
      // Stage environment does not support Avalanche Fuji
      [Env.testnet]: mapChains([ChainId.avalancheFuji], (chain) => ({
        amountStrategy: 'identity',
        approval: { ...SILO_BTCB_APPROVE_APPROVAL },
        spenderContract: {
          abi: SILO_VAULT_SPENDER_ABI as Abi,
          address: SILO_VAULT_SPENDER_CONTRACT_GASTALD_FUJI,
          chainId: chain,
        },
      })),
    },
  },
};

/**
 * Type for a token that can be used with stake and bake.
 * Includes both Token enum values and virtual tokens like 'BTC'.
 */
export type StakeAndBakeToken = DefiRegistryToken;

/**
 * Get supported chains for a protocol/token/env combination.
 *
 * @example
 * ```typescript
 * // Get chains supporting Bitcoin Earn with BTC token on testnet
 * const chains = getStakeAndBakeSupportedChains(DefiProtocol.BitcoinEarn, 'BTC', Env.testnet);
 * // Returns: [ChainId.binanceSmartChainTestnet, ChainId.holesky]
 * ```
 */
export function getStakeAndBakeSupportedChains(
  protocol: DefiProtocol,
  token: StakeAndBakeToken,
  env: Env,
): ChainId[] {
  const protocolRegistry = DEFI_REGISTRY[protocol];
  if (!protocolRegistry) return [];

  const tokenRegistry =
    protocolRegistry[token as keyof typeof protocolRegistry];
  if (!tokenRegistry) return [];

  const envRegistry = tokenRegistry[env];
  if (!envRegistry) return [];

  return Object.keys(envRegistry).map(Number) as ChainId[];
}

/**
 * Get all supported protocols for stake and bake (regardless of environment).
 */
export function getSupportedProtocols(assetId: AssetId): DefiProtocol[] {
  return Object.entries(DEFI_REGISTRY)
    .filter(([_, tokenMap]) => assetId in tokenMap)
    .map(([protocol]) => protocol as DefiProtocol);
}

/**
 * Get available protocols for a specific environment and token.
 *
 * This filters protocols based on what is actually configured in the DEFI_REGISTRY
 * for the given environment. Use this to determine which protocol options should
 * be shown in the UI.
 *
 * @example
 * ```typescript
 * // Get protocols available for LBTC in production
 * const prodProtocols = getAvailableProtocols(AssetId.LBTC, Env.prod);
 * // Returns: ['bitcoinEarn'] - Silo is only on Avalanche which has no mainnet prod config
 *
 * // Get protocols available for BTCb in testnet
 * const testnetProtocols = getAvailableProtocols(AssetId.BTCb, Env.testnet);
 * // Returns: ['silo'] - Silo is available on Avalanche Fuji in testnet
 * ```
 */
export function getAvailableProtocols(
  assetId: AssetId,
  env: Env,
): DefiProtocol[] {
  // Map asset IDs to registry tokens
  const tokenMap: Partial<Record<AssetId, StakeAndBakeToken[]>> = {
    [AssetId.LBTC]: [Token.LBTC, 'BTC'],
    [AssetId.BTCb]: [Token.BTCb],
    [AssetId.BTC]: ['BTC'],
  };

  const tokens = tokenMap[assetId];
  if (!tokens) return [];

  const availableProtocols: Set<DefiProtocol> = new Set();

  for (const [protocol, tokenStrategyMap] of Object.entries(DEFI_REGISTRY)) {
    for (const token of tokens) {
      const tokenRegistry =
        tokenStrategyMap[token as keyof typeof tokenStrategyMap];
      if (!tokenRegistry) continue;

      const envRegistry = tokenRegistry[env];
      if (!envRegistry || Object.keys(envRegistry).length === 0) continue;

      availableProtocols.add(protocol as DefiProtocol);
    }
  }

  return Array.from(availableProtocols);
}

/**
 * Get available protocols with their metadata for UI display.
 *
 * @example
 * ```typescript
 * const protocols = getAvailableProtocolsWithMetadata(AssetId.LBTC, Env.prod);
 * // Returns: [{ value: 'bitcoinEarn', label: 'Bitcoin Earn', url: '...' }]
 * ```
 */
export function getAvailableProtocolsWithMetadata(
  assetId: AssetId,
  env: Env,
): Array<{ value: DefiProtocol; label: string; url: string }> {
  const protocols = getAvailableProtocols(assetId, env);

  return protocols.map((protocol) => ({
    value: protocol,
    label: DefiProtocols[protocol]?.name ?? protocol,
    url: DefiProtocols[protocol]?.url ?? '',
  }));
}
