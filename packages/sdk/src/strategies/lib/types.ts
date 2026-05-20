import BigNumber from 'bignumber.js';
import { Address, Hash } from 'viem';

/**
 * Shape of the response from `GET /api/v1/strategies/{strategy}/config` on
 * the vault-manager API.
 *
 * gRPC-Gateway omits zero/false fields on the wire; consumers must normalize
 * before reading. `getStrategyConfig` performs that normalization so callers
 * receive a fully-populated object.
 */
export interface IStrategyConfigResponse {
  name: string;
  symbol: string;
  decimals: number;
  baseAsset: IStrategyBaseAsset;
  depositAssets: IStrategyDepositAsset[];
  shards: Address[];
  defaultShard?: Address;
  feeConfig: IStrategyFeeConfig;
  /** Operator's withdrawal SLA, seconds. */
  withdrawalTargetSeconds: number;
  /** Optional curator allocation breakdown for the portfolio view. */
  allocations?: IStrategyAllocationRow[];
  /** APY string from the backend, if computed. SDK does not synthesize one. */
  apy?: string;
  /** TVL in base-asset units, if the backend exposes it. */
  tvlBaseAsset?: string;
}

export interface IStrategyBaseAsset {
  address: Address;
  symbol: string;
  decimals: number;
}

/**
 * Static metadata for a deposit asset: token + per-asset Converter address
 * the curator wired into the Strategy, plus the display symbol/decimals that
 * the contract does not store. Used by the bundled catalog
 * (`LOMBARD_STRATEGY_DEPOSIT_ASSETS`) so the UI can render an asset list
 * without an RPC roundtrip.
 */
export interface IStrategyDepositAssetStatic {
  token: Address;
  converter: Address;
  symbol: string;
  decimals: number;
}

export interface IStrategyFeeConfig {
  managementFeeBps: number;
  performanceFeeBps: number;
  redeemFeeBps: number;
}

export interface IStrategyAllocationRow {
  id: string;
  allocation: string;
  collateral: string;
  debt: string;
  protocol: string;
  activePosition: string;
}

/**
 * On-chain state snapshot of the Strategy contract.
 */
export interface IStrategyState {
  /** Global pause flag (`paused()` on the contract). */
  paused: boolean;
  /** Deposit-only pause (`depositPaused()`). Independent of `paused`. */
  depositPaused: boolean;
  /** Redeem-only pause (`redeemPaused()`). Independent of `paused`. */
  redeemPaused: boolean;
  /** ERC20-style metadata. */
  name: string;
  symbol: string;
  decimals: number;
  /** Address of the base asset the operator pays redemptions in. */
  baseAssetAddress: Address;
  /**
   * Current price per share in base-asset units (1e`decimals`). Use
   * `convertToAssets` for precise per-call quoting; this is good enough
   * for headline display.
   */
  pricePerShare: BigNumber;
  /** Total backing assets (in base asset). */
  totalAssets: BigNumber;
  /** Total shares issued. */
  totalShares: BigNumber;
  /** Total pending redemption shares + assets across all requests. */
  totalPending: {
    shares: BigNumber;
    assets: BigNumber;
  };
  /** Management fee, in basis points. */
  managementFeeBps: number;
  /** Performance fee, in basis points. */
  performanceFeeBps: number;
  /** Redeem fee, in basis points. */
  redeemFeeBps: number;
}

/**
 * User's position in a Strategy.
 */
export interface IStrategyPosition {
  /** Raw share balance, in share base units (1e`decimals`). */
  sharesRaw: bigint;
  /** Share balance in human-readable share units. */
  shares: BigNumber;
  /**
   * Value of the user's shares in base asset units, in human-readable form.
   * Computed as `shares * pricePerShare`. Off by haircuts and accrued fees;
   * call `convertToAssets` for precise quotes when needed.
   */
  baseAssetValue: BigNumber;
  /**
   * Total pending redemption value for this account, in base asset units,
   * human-readable. Populated from `pendingAssetsOf(account)`.
   */
  pendingBaseAsset: BigNumber;
}

/**
 * One in-flight redemption request.
 *
 * Cannot be cancelled by the depositor; the shares stay locked until the
 * operator settles. The payout always lands on `owner` — the contract has
 * no separate `receiver` parameter.
 */
export interface IStrategyPendingRedeem {
  /** Numeric request id returned by `requestRedeem` and emitted in `RedeemRequested`. */
  requestId: bigint;
  /** Shares awaiting fulfillment. */
  pendingShares: bigint;
  /**
   * Base-asset units quoted at request time (`shares * NAVAtRedeemRequest`).
   * This is an UPPER BOUND on the actual payout, not a guarantee: the
   * Strategy may settle at the lower of this snapshot and the live
   * `pricePerShare` at payout time, so the realized amount can be smaller
   * if NAV drops while the request sits in the queue. See module README
   * for the exact formula.
   */
  pendingAssets: bigint;
  /** Owner who will receive the payout (no separate receiver argument). */
  owner: Address;
}

/**
 * Result of `requestStrategyRedeem`.
 */
export interface IRequestStrategyRedeemResult {
  txHash: Hash;
  /**
   * Request id parsed from the `RedeemRequested` event in the tx receipt.
   * `undefined` if the receipt could not be matched (e.g. Safe multisig
   * deferred execution); callers should fall back to reading
   * `pendingAssetsOf(owner)` over polling.
   */
  requestId: bigint | undefined;
}

/**
 * Live deposit-asset entry sourced from the Strategy contract itself, paired
 * with static catalog metadata (symbol, decimals) the contract does not store.
 * Extends `IStrategyDepositAssetStatic` with the on-chain `depositFeeBps`.
 * Also used as the depositor-side shape returned by the vault-manager config
 * API.
 */
export interface IStrategyDepositAsset extends IStrategyDepositAssetStatic {
  /** Deposit haircut for this asset, in basis points. */
  depositFeeBps: number;
}

/**
 * Shard inventory for the "where is my money parked" view. Read-only; the
 * depositor flow never targets a shard directly.
 */
export interface IStrategyShards {
  shards: Address[];
  defaultShard: Address;
}
