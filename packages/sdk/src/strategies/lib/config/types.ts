import { Env } from '@lombard.finance/sdk-common';
import { Abi, Address } from 'viem';

import { ChainId } from '../../../common/chains';
import { IStrategyDepositAssetStatic } from '../types';

export type StrategyId = string;

/**
 * A single on-chain deployment of a Strategy template on one chain. Each
 * deployment is self-describing (carries its own `chainId`) and has its own
 * contract address + deposit-asset catalog, so a single environment can span
 * multiple chains with different addresses.
 */
export interface StrategyChainDeployment {
  chainId: ChainId;
  /** Canonical Strategy contract address for this deployment's chain. */
  contract: Address;
  /**
   * Static catalog of deposit assets for this deployment. The Strategy is the
   * source of truth on-chain (`isDepositAsset`, `converterOf`, `depositFee`);
   * this seeds the UI without an RPC roundtrip and carries the symbol /
   * decimals the contract does not store for the deposit-side asset.
   */
  depositAssets: ReadonlyArray<IStrategyDepositAssetStatic>;
}

/**
 * A Lombard DeFi Vault Strategy (e.g. BTCoc) and its per-environment
 * deployments. Multi-strategy is architecturally expected (the Strategy is a
 * redeployable template); each strategy gets its own definition file under
 * `config/strategies/` and is registered in the registry.
 *
 * `deployments` is keyed by environment and is partial: a strategy need not be
 * deployed in every environment. Each environment maps to a list of per-chain
 * deployments (usually one); the first entry is the primary/default chain.
 */
export interface StrategyDefinition {
  /** Stable machine id, e.g. `'btcoc'`. */
  id: StrategyId;
  /** Human-readable label. */
  name: string;
  /** Strategy contract ABI (shared across deployments of this template). */
  abi: Abi;
  /**
   * Share-token decimals. The Strategy exposes a `decimals()` view; this is
   * the bootstrap default used before the first read and as a sanity check.
   */
  decimals: number;
  /** Per-chain deployments, keyed by environment. */
  deployments: Partial<Record<Env, readonly StrategyChainDeployment[]>>;
}
