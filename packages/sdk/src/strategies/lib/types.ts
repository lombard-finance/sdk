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

// =====================================================================
// Per-user vault-manager API (/v2/vaults/strategies/{address}/users/{owner}/*)
// =====================================================================

/**
 * One entry in the user's strategy activity timeline. Backed by an indexed
 * on-chain event (`Deposit`, `RedeemRequested`, `RedeemRequestsFulfilled`).
 *
 * A redeem lifecycle produces two rows that share the same `requestId`:
 * a `redeem_requested` row whose `status` reflects the latest state, and a
 * `redeem_fulfilled` row when the operator settles the request. Consumers
 * that render a tx history typically de-dupe by `requestId` and show only
 * the `redeem_requested` row with `status` updated.
 */
export interface IStrategyUserActivityEntry {
  activityType: 'deposit' | 'redeem_requested' | 'redeem_fulfilled';
  blockTime: Date;
  txHash: Hash;
  blockHeight: bigint;
  logIndex: number;
  /** ERC-20 address. Deposit asset for `deposit`; base asset for redeem rows. */
  asset: Address;
  assetSymbol: string;
  /**
   * Raw token amount (asset's native decimals). For `deposit`: NET amount
   * post deposit-fee that backed the share mint. For redeem rows: NET
   * pending/payable amount.
   */
  amount: BigNumber;
  /**
   * `'pending'` / `'fulfilled'` for `redeem_requested` (reflects current
   * lifecycle state). `'fulfilled'` for `redeem_fulfilled`. Empty for
   * `deposit`.
   */
  status: 'pending' | 'fulfilled' | '';
  /** Set for redeem rows. Links `redeem_requested` and `redeem_fulfilled`. */
  requestId?: bigint;
}

/**
 * One redeem request belonging to a specific user, in any lifecycle state.
 * Pending-only by default; pass `includeFulfilled: true` to also receive
 * settled requests.
 */
export interface IStrategyUserWithdrawalRequest {
  requestId: bigint;
  owner: Address;
  /** NET base-asset amount due on fulfillment. */
  assets: BigNumber;
  /** NET shares burned for this request. */
  shares: BigNumber;
  requestedAt: Date;
  requestTx: Hash;
  /** PPS at-or-before `requestedAt`. Absent if no PPS snapshot existed yet. */
  ppsAtRequest?: BigNumber;
  /** `requestedAt + withdrawalTargetSeconds`. Absent if SLA not configured. */
  expiresAt?: Date;
  status: 'pending' | 'fulfilled';
  /** Set when `status === 'fulfilled'`. */
  fulfilledAt?: Date;
  /** Set when `status === 'fulfilled'`. */
  fulfillTx?: Hash;
}

/**
 * Live per-user position snapshot, with derived principal / accrued yield.
 *
 * `shares` and `baseAssetValue` are live (`shares × pps`). `principalBtc`
 * and `accruedYieldBtc` are derived server-side from indexed deposit and
 * fulfilled-redeem events: P2P share-token transfers are NOT tracked, so
 * accounts that have ever sent or received shares from another wallet may
 * see drift here.
 */
export interface IStrategyUserPosition {
  shares: BigNumber;
  baseAssetValue: BigNumber;
  /** Σ assets across the user's open (unfulfilled) redeem requests. */
  pendingBaseAsset: BigNumber;
  /** Block time of the user's first deposit on this strategy. */
  firstDepositedAt?: Date;
  /** Net deposits − fulfilled redeems, in base-asset units. */
  principalBtc: BigNumber;
  /** Signed: `baseAssetValue − principalBtc`. Negative when PPS dropped. */
  accruedYieldBtc: BigNumber;
  depositsCount: number;
}

/** One point on the user's position-value-over-time chart. */
export interface IStrategyUserPositionSnapshot {
  timestamp: Date;
  shares: BigNumber;
  baseAssetValue: BigNumber;
}

/**
 * One point on the Strategy NAV / price-per-share time series. Backed by
 * `GET /v2/vaults/strategies/{address}/nav-history`.
 */
export interface IStrategyNavSnapshot {
  timestamp: Date;
  /** NAV in base-asset units (human-readable, decimals already applied). */
  nav: BigNumber;
  /** Price per share in human-readable units. */
  pricePerShare: BigNumber;
}

/**
 * One sample on the Strategy aggregate-rates time series. Backed by
 * `GET /v2/vaults/strategies/{address}/rates-history`. Rates are returned in
 * basis points by the API and converted to fractions (1.0 = 100%) here so
 * the consumer never has to remember the unit.
 */
export interface IStrategyRatesSnapshot {
  timestamp: Date;
  /** Net carry, fraction (supply APY − borrow APY, signed). */
  netCarry: BigNumber;
  /** STRC yield, fraction. */
  strcYield: BigNumber;
}
