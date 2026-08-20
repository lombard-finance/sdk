/**
 * The unified BTC route config
 *
 * `BtcStake` and `BtcDeposit` carried two config interfaces that were
 * structurally identical apart from one method name — `getSignature` against
 * `signDestination` — and two pairs of result types that differed only by which
 * optional fields one side had bothered to declare. The merge in stage C needs
 * one shape both routes satisfy, so this is it.
 *
 * The route is the only thing that differs between BTC journeys. That is what
 * lets one class serve all four: no asset branching inside the class, just a
 * different row from `BTC_DEPOSIT_ROUTES`.
 *
 * @module chains/btc/actions/shared/routeConfig
 */

import type { Env } from '@lombard.finance/sdk-common';
import type { z } from 'zod';

import type { AssetId, Chain, ChainType } from '../../../../core';
import type { BtcCoreContext } from '../../../../shared/context';

// ═══════════════════════════════════════════════════════════════════════════
// Signature results
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A destination signature.
 *
 * The union of what the two v5 shapes declared: the stake route carried
 * `pubKey` and `paddedAddress`, the deposit route did not. Both are optional,
 * so a route that produces neither still satisfies this.
 */
export interface BtcSignatureResult {
  signature: string;
  typedData?: string;
  pubKey?: string;
  paddedAddress?: string;
}

/**
 * A fee signature read back from the server.
 *
 * `expirationDate` was on the stake shape only. Keeping it optional here means
 * a route that cannot report expiry is still valid, and a caller checking it
 * gets `undefined` rather than a type error.
 */
export interface BtcStoredFeeSignature {
  hasSignature: boolean;
  signature?: string;
  typedData?: string;
  expirationDate?: string;
}

/** The result of running the fee ceremony. */
export interface BtcFeeAuthResult {
  signature: string;
  typedData?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Route definition
// ═══════════════════════════════════════════════════════════════════════════

/** Where a route can start, and in which environments. */
export interface BtcRouteDefinition {
  sourceChains: Chain[];
  envs: Env[];
}

/**
 * The fee ceremony, when a destination requires one.
 *
 * `getFeeAuthConfig` returning `null` is how a route says "no fee ceremony
 * here", which is the case for every non-Ethereum destination.
 */
export interface BtcFeeAuthConfig {
  getMintingFee: (ctx: BtcCoreContext, chainId: unknown) => Promise<string>;
  restoreFeeSignature: (
    ctx: BtcCoreContext,
    chainId: unknown,
    address: string,
  ) => Promise<BtcStoredFeeSignature | null>;
  authorizeFee: (
    ctx: BtcCoreContext,
    params: { chainId: unknown; recipient: string; fee: string },
  ) => Promise<BtcFeeAuthResult>;
}

/**
 * Everything a BTC deposit route needs, for one chain type.
 *
 * Satisfied by both v5 config shapes. `getSignature` is the stake route's name
 * for what the deposit route called `signDestination`; the stake spelling wins
 * because it says what it returns rather than what it does to a parameter.
 */
export interface BtcDepositRouteConfig {
  chainType: ChainType;
  routes: BtcRouteDefinition[];
  destChains: Chain[];
  supportedAssetsOut: AssetId[];
  addressSchema: z.ZodType<string>;

  /** Non-null when the destination requires a fee signature. */
  getFeeAuthConfig: (destChain: Chain) => BtcFeeAuthConfig | null;

  /** The destination signature the deposit address is derived from. */
  getSignature: (
    ctx: BtcCoreContext,
    recipient: string,
    chainId: unknown,
  ) => Promise<BtcSignatureResult>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Adapting the v5 configs
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The v5 deposit config, which spells the signature method `signDestination`.
 *
 * Declared here rather than imported so this module stays free of the two
 * config trees it is meant to replace.
 */
interface LegacyDepositShapedConfig extends Omit<
  BtcDepositRouteConfig,
  'getSignature'
> {
  signDestination: BtcDepositRouteConfig['getSignature'];
}

/** True when a config uses the deposit route's spelling. */
function usesLegacyDepositSpelling(
  config: BtcDepositRouteConfig | LegacyDepositShapedConfig,
): config is LegacyDepositShapedConfig {
  return (
    typeof (config as LegacyDepositShapedConfig).signDestination === 'function'
  );
}

/**
 * Normalises either v5 config into `BtcDepositRouteConfig`.
 *
 * Both v5 trees stay where they are during the alias window, so the merged
 * class reads them through this rather than through a copy that could drift.
 */
export function toBtcDepositRouteConfig(
  config: BtcDepositRouteConfig | LegacyDepositShapedConfig,
): BtcDepositRouteConfig {
  if (usesLegacyDepositSpelling(config)) {
    const { signDestination, ...rest } = config;
    return { ...rest, getSignature: signDestination };
  }

  return config;
}

// ═══════════════════════════════════════════════════════════════════════════
// Authorization
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Which ceremony a BTC route needs before it can issue a deposit address.
 *
 * A route needs exactly one of these, decided by the destination rather than
 * by the caller. `none` covers the subsidised destinations, where the address
 * can be generated straight after `prepare()`.
 */
export type BtcAuthorizationKind =
  | 'fee'
  | 'address-confirmation'
  | 'vault-deposit'
  | 'none';

/**
 * Overrides for the signing ceremony.
 *
 * `expiry` reaches `signStakeAndBake`, which has always accepted it and
 * defaulted to 24 hours, but no higher-level caller could set it: the field was
 * missing from `SignStakeAndBakeParams`, so neither the service nor the config
 * could forward one, and `authorizeDeposit()` took no arguments at all.
 *
 * It is an absolute UNIX timestamp in seconds, matching the low-level parameter
 * it forwards to, so no second unit convention enters the SDK.
 *
 * Ignored by protocols whose approval config uses a zero deadline — Silo BTC.b
 * signs with no expiry — so it is accepted for interface parity on that route
 * rather than silently changing it.
 */
export interface BtcAuthorizeOptions {
  expiry?: number;
}
