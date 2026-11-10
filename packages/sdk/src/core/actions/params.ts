/**
 * Action parameters and results
 *
 * @module core/actions/params
 */

import type { DefiProtocol } from '../../defi/defi-registry';
import type { AssetId } from '../assets/types';
import type { Chain } from '../chains/types';

/**
 * A vault share amount.
 *
 * Nominal rather than a bare string, because share decimals are not asset
 * decimals and the two were interchangeable at the type level. `AssetId` has no
 * share member and adding one per vault would reintroduce the cost this design
 * removes, so `protocol` names the share token instead.
 */
export type ShareAmount = string & { readonly __shares: unique symbol };

/** Constructs a `ShareAmount` from a decimal string. */
export function shares(amount: string): ShareAmount {
  return amount as ShareAmount;
}

/**
 * `deposit`: an asset in, an L-asset out.
 *
 * The `never` guards make the two arms mutually exclusive. Without them an
 * object carrying both `assetOut` and `protocol` satisfies the union, and the
 * caller has said two contradictory things about where the value goes.
 */
export type DepositParams<TChain extends Chain = Chain> =
  | {
      assetIn: AssetId;
      assetOut: AssetId;
      sourceChain?: TChain;
      destChain?: TChain;
      protocol?: never;
    }
  | {
      assetIn: AssetId;
      protocol: DefiProtocol;
      sourceChain?: TChain;
      destChain?: TChain;
      assetOut?: never;
    };

/**
 * `withdraw`: an L-asset in, an asset out — or a vault position out.
 *
 * The vault arm takes no `assetIn`: the position is identified by `protocol`,
 * and the shares being burned have no `AssetId`.
 */
export type WithdrawParams<TChain extends Chain = Chain> =
  | {
      assetIn: AssetId;
      assetOut: AssetId;
      sourceChain?: TChain;
      destChain?: TChain;
      protocol?: never;
    }
  | {
      protocol: DefiProtocol;
      assetOut: AssetId;
      sourceChain?: TChain;
      destChain?: TChain;
      assetIn?: never;
    };

/**
 * `deploy`: an asset in, a protocol position out.
 *
 * There is no `assetOut`. A vault deposit returns share tokens, and no
 * `AssetId` names them — which is why `deploy` is its own verb rather than a
 * shape of `deposit`.
 *
 * `asset` rather than `assetIn` because there is only one asset in the call.
 * The registry key is **not** derived from it: see `resolveRegistryToken`.
 */
export interface DeployParams<TChain extends Chain = Chain> {
  asset: AssetId;
  protocol: DefiProtocol;
  sourceChain?: TChain;
  destChain?: TChain;
  assetOut?: never;
}

/**
 * What `prepare()` takes.
 *
 * Exactly one of `amount` or `shares`. `amount` is asset-denominated; `shares`
 * is for vault withdrawals, where the input is in share decimals.
 */
export interface PrepareParams {
  amount?: string;
  shares?: ShareAmount;
  /** Five actions take none. */
  recipient?: string;
  referralCode?: string;
}

/**
 * What `execute()` returns.
 *
 * A discriminated union because two sentinels currently travel in value
 * positions: the API returns `SANCTIONED_ADDRESS` where an address goes, and
 * `sdk-solana` returns `'ALREADY_MINTED'` where a transaction hash goes. A
 * status must not masquerade as a value.
 *
 * This makes `const { txHash } = await execute()` a compile error, which is
 * intended.
 */
export type ActionResult =
  | { kind: 'tx'; txHash: string }
  | { kind: 'address'; depositAddress: string; txHash?: string }
  | { kind: 'rejected'; reason: 'sanctioned_address' }
  | { kind: 'already_settled' };

/** Narrows an `ActionResult` to the transaction arm. */
export function isTxResult(
  result: ActionResult,
): result is { kind: 'tx'; txHash: string } {
  return result.kind === 'tx';
}

/** Narrows an `ActionResult` to the deposit-address arm. */
export function isAddressResult(
  result: ActionResult,
): result is { kind: 'address'; depositAddress: string; txHash?: string } {
  return result.kind === 'address';
}
