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
import { Token } from '../tokens/token-addresses';
import { SILO_VAULT_SPENDER_ABI } from '../vaults/abi';
import {
  VEDA_VAULT_SPENDER_CONTRACTS,
  VedaVaultStakeAndBakeChain,
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

const VEDA_STAKE_AND_BAKE_CHAINS = [
  ChainId.ethereum,
  ChainId.binanceSmartChain,
  ChainId.binanceSmartChainTestnet,
  ChainId.holesky,
] as const satisfies readonly ChainId[];

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

function getVedaSpenderContract(
  chainId: VedaVaultStakeAndBakeChain,
): ContractInfo {
  const contract = VEDA_VAULT_SPENDER_CONTRACTS[chainId];
  if (!contract) {
    throw new Error(`Missing Veda spender contract for chain ${chainId}`);
  }
  return contract;
}

export const DefiRegistryTokens = {
  LBTC: Token.LBTC,
  BTCb: Token.BTCb,
  BTC: 'BTC',
} as const;

export type DefiRegistryToken =
  (typeof DefiRegistryTokens)[keyof typeof DefiRegistryTokens];

export const DefiProtocol = {
  Veda: 'Veda',
  Silo: 'Silo',
} as const;

export type DefiProtocol = (typeof DefiProtocol)[keyof typeof DefiProtocol];

export const DefiProtocols = {
  [DefiProtocol.Veda]: {
    name: 'Lombard DeFi Vault',
    url: 'https://lombard.finance',
  },
  [DefiProtocol.Silo]: {
    name: 'Silo Finance Vault',
    url: 'https://silo.finance',
  },
} as const;

const VEDA_LBTC_PERMIT_APPROVAL: StakeAndBakeStrategyConfig['approval'] = {
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
 */
export const DEFI_REGISTRY: StakeAndBakeRegistry = {
  [DefiProtocol.Veda]: {
    [Token.LBTC]: mapEnvs(ALL_ENVS, () =>
      mapChains(VEDA_STAKE_AND_BAKE_CHAINS, chain => ({
        amountStrategy: 'identity',
        approval: { ...VEDA_LBTC_PERMIT_APPROVAL },
        spenderContract: getVedaSpenderContract(chain),
      })),
    ),
    BTC: mapEnvs(ALL_ENVS, () =>
      mapChains(VEDA_STAKE_AND_BAKE_CHAINS, chain => ({
        amountStrategy: 'btcToLbtc',
        approval: { ...VEDA_LBTC_PERMIT_APPROVAL },
        spenderContract: getVedaSpenderContract(chain),
      })),
    ),
  },
  [DefiProtocol.Silo]: {
    [Token.BTCb]: {
      [Env.testnet]: mapChains([ChainId.avalancheFuji], chain => ({
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
