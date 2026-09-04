/**
 * The action interfaces
 *
 * Route-specific members live on narrower interfaces rather than on `Action`,
 * so a consumer holding an `Action` cannot reach for `generateDepositAddress()`
 * on a route that has no deposit address.
 *
 * @module core/actions/interfaces
 */

import type { FeeAuthState } from '../../chains/evm/shared/feeAuth';
import type { LombardError } from '../../shared/errors';
import type { ActionResult, PrepareParams } from './params';
import type { ActionProgress } from './progress';
import type { AuthorizationGroup, RouteLabel } from './route';
import type { ActionStatus } from './status';
import type { ActionSteps } from './steps';

/**
 * What every action exposes.
 *
 * `isLoading`, `isFailed` and `error` are not new: they live on `BaseAction`
 * and all sixteen v5 classes inherit them. `BaseAction`'s own docblock teaches
 * consumers to read them together (`IDLE + isLoading` means "Preparing…"), and
 * eight files across both repos do exactly that. An interface that omitted them
 * would be narrower than the classes it describes.
 *
 * `txHash` and `amount` are deliberately absent, though twelve classes have
 * them. `execute()` returns `ActionResult` now, and `amount` was a caller input
 * echoed back. Concrete classes may keep both as conveniences; they are not
 * part of the contract.
 */
export interface Action {
  /** Where in the flow this is. Never `failed`; see `isFailed`. */
  readonly status: ActionStatus;
  /** Whether an async call is in flight. Orthogonal to `status`. */
  readonly isLoading: boolean;
  /**
   * Derived from `error !== null`.
   *
   * Spelled `isFailed`, not `hasFailed`. The design draft used the latter while
   * asserting the member was carried over unchanged from `BaseAction`, but
   * `BaseAction` calls it `isFailed` and eight non-test call sites read that
   * name. Renaming it would add a migration row against the continuity argument
   * that put it on this interface in the first place.
   */
  readonly isFailed: boolean;
  readonly error: LombardError | null;

  /**
   * The ordered subset of steps this route actually uses.
   *
   * Not static, which is why it is not on `RouteStrategy`: it drops
   * `authorizing` on a JWT address route, and whether a route is a JWT route
   * depends on `getAuthToken()` returning a token — a caller-supplied closure
   * read at call time. A user who signs the wallet challenge between
   * construction and `prepare()` moves the answer.
   */
  readonly applicableSteps: readonly (keyof ActionSteps)[];

  /** Which ceremony `authorize()` will run next, if any. */
  readonly pendingAuthorization?: AuthorizationGroup;

  /** Which journey this instance is running. */
  readonly route: RouteLabel;

  prepare(params: PrepareParams): Promise<void>;

  /**
   * Runs the next outstanding ceremony.
   *
   * One method for what were four. It records completed groups and skips them,
   * so a retry after partial failure does not replay every signature and a
   * double-click does not fire N of them.
   */
  authorize(): Promise<void>;

  execute(): Promise<ActionResult>;

  /** One poll, not a stream. Returns `undefined` when there is nothing new. */
  monitor(): Promise<ActionProgress | undefined>;
}

/** An action funded by the user sending Bitcoin to an issued address. */
export interface BitcoinSourceAction extends Action {
  readonly depositAddress?: string;
  generateDepositAddress(captchaToken?: string): Promise<string>;
}

/** An action whose route requires a fee signature on unsubsidized chains. */
export interface FeeAuthorizedAction extends Action {
  readonly feeAuth: FeeAuthState;
}

/** The vault-exit cancellation, which needs no amount and no recipient. */
export interface CancellableAction extends Omit<Action, 'prepare'> {
  prepare(): Promise<void>;
}

/** The claim flow, which takes its proof from the caller. */
export interface ClaimableAction extends Action {
  setClaimData(data: string, proofSignature: string): void;
}
