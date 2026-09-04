/**
 * Action status
 *
 * One vocabulary, narrowed per action, replacing the four status enums:
 * `BtcActionStatus`, `EvmOperationStatus`, `NonEvmOperationStatus` and the
 * publicly exported `EvmDepositStatus`, which is a TS `enum` rather than an
 * `as const` object and owns `bridging`, a value no other enum has.
 *
 * @module core/actions/status
 */

/**
 * Every status any action can report.
 *
 * ## There is no `FAILED`, deliberately
 *
 * `BaseAction` freezes `status` at the step where the failure happened, so the
 * status answers *where* and `hasFailed` (derived from `error !== null`)
 * answers *whether*. None of the four enums this replaces has a failure member.
 * A `FAILED` status would make "where did it fail" unanswerable and give every
 * consumer two places to look for one fact.
 */
export const ActionStatus = {
  /** Constructed, nothing prepared yet. */
  IDLE: 'idle',

  // ── Authorization, mutually exclusive per route ──
  /** ERC20 approval needed. Renamed from the hyphenated `needs-approval`. */
  NEEDS_APPROVAL: 'needs_approval',
  /** Fee authorization needed, on unsubsidized chains. */
  NEEDS_FEE_AUTHORIZATION: 'needs_fee_authorization',
  /** Destination address confirmation needed, on non-Ethereum destinations. */
  NEEDS_ADDRESS_CONFIRMATION: 'needs_address_confirmation',
  /** Vault deposit authorization needed. Renamed from `needs_deploy_...`. */
  NEEDS_DEPOSIT_AUTHORIZATION: 'needs_deposit_authorization',

  /** Authorized, ready for `execute()`. */
  READY: 'ready',
  /** A Bitcoin deposit address has been issued; the user has not sent BTC yet. */
  ADDRESS_READY: 'address_ready',
  /** In flight across a bridge. */
  BRIDGING: 'bridging',
  /** Submitted, waiting for confirmations. */
  CONFIRMING: 'confirming',
  /** Confirmed on chain, waiting for the off-chain leg. */
  SETTLING: 'settling',
  /**
   * Accepted into a withdrawal queue and not yet settled.
   *
   * The one terminal that is new in this release. The vault exit reported
   * `COMPLETED` while the withdrawal was still queued, so a UI reading it
   * literally told users an unsettled request had settled. `cancelWithdraw()`
   * remains valid from here, which `COMPLETED` never implied.
   */
  QUEUED: 'queued',
  /** Done. Nothing further is pending. */
  COMPLETED: 'completed',
} as const;

export type ActionStatus = (typeof ActionStatus)[keyof typeof ActionStatus];

/** Statuses that mean the action is waiting on a user signature. */
export const AUTHORIZATION_STATUSES = [
  ActionStatus.NEEDS_APPROVAL,
  ActionStatus.NEEDS_FEE_AUTHORIZATION,
  ActionStatus.NEEDS_ADDRESS_CONFIRMATION,
  ActionStatus.NEEDS_DEPOSIT_AUTHORIZATION,
] as const;

export type AuthorizationStatus = (typeof AUTHORIZATION_STATUSES)[number];

/**
 * Statuses after which nothing more happens without a new call.
 *
 * `ADDRESS_READY` is terminal for the SDK's part of a Bitcoin-source route: the
 * next event comes from the user sending Bitcoin, not from the action.
 */
export const TERMINAL_STATUSES = [
  ActionStatus.ADDRESS_READY,
  ActionStatus.QUEUED,
  ActionStatus.COMPLETED,
] as const;

export type TerminalStatus = (typeof TERMINAL_STATUSES)[number];

/** True when the action is waiting on a signature. */
export function isAuthorizationStatus(
  status: ActionStatus,
): status is AuthorizationStatus {
  return (AUTHORIZATION_STATUSES as readonly ActionStatus[]).includes(status);
}

/** True when nothing further happens without another call. */
export function isTerminalStatus(
  status: ActionStatus,
): status is TerminalStatus {
  return (TERMINAL_STATUSES as readonly ActionStatus[]).includes(status);
}

// ═══════════════════════════════════════════════════════════════════════════
// Per-action narrowings
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Each action declares the subset it can report, so an impossible status is a
 * compile error at the consumer rather than a runtime surprise. `Extract` keeps
 * the members tied to the one vocabulary: a typo in a narrowing resolves to
 * `never` and fails where it is used.
 */

export type EvmDepositStatus = Extract<
  ActionStatus,
  | 'idle'
  | 'needs_approval'
  | 'needs_fee_authorization'
  | 'ready'
  | 'confirming'
  | 'completed'
>;

export type EvmWithdrawStatus = Extract<
  ActionStatus,
  | 'idle'
  | 'needs_approval'
  | 'needs_fee_authorization'
  | 'ready'
  | 'confirming'
  | 'settling'
  | 'completed'
>;

export type EvmDeployStatus = Extract<
  ActionStatus,
  | 'idle'
  | 'needs_approval'
  | 'needs_deposit_authorization'
  | 'ready'
  | 'confirming'
  | 'completed'
>;

/** The vault exit, which ends `QUEUED` rather than `COMPLETED`. */
export type EvmVaultWithdrawStatus = Extract<
  ActionStatus,
  'idle' | 'needs_approval' | 'ready' | 'confirming' | 'queued'
>;

/**
 * The claim flow, v5's `EvmDeposit`. It owns `bridging`, which no other v5 enum
 * had, because the deposit being claimed crosses chains before it can be minted.
 */
export type EvmClaimStatus = Extract<
  ActionStatus,
  'idle' | 'needs_approval' | 'ready' | 'bridging' | 'confirming' | 'completed'
>;

export type EvmCancelWithdrawStatus = Extract<
  ActionStatus,
  'idle' | 'ready' | 'confirming' | 'completed'
>;

export type BtcDepositStatus = Extract<
  ActionStatus,
  | 'idle'
  | 'needs_fee_authorization'
  | 'needs_address_confirmation'
  | 'needs_deposit_authorization'
  | 'ready'
  | 'address_ready'
  | 'settling'
  | 'completed'
>;

export type BtcDeployStatus = Extract<
  ActionStatus,
  | 'idle'
  | 'needs_deposit_authorization'
  | 'ready'
  | 'address_ready'
  | 'settling'
  | 'completed'
>;

export type SolanaDepositStatus = Extract<
  ActionStatus,
  'idle' | 'ready' | 'confirming' | 'completed'
>;

export type SolanaWithdrawStatus = Extract<
  ActionStatus,
  'idle' | 'ready' | 'confirming' | 'settling' | 'completed'
>;

export type SuiWithdrawStatus = Extract<
  ActionStatus,
  'idle' | 'ready' | 'confirming' | 'settling' | 'completed'
>;

export type StarknetWithdrawStatus = Extract<
  ActionStatus,
  'idle' | 'ready' | 'confirming' | 'settling' | 'completed'
>;

/**
 * The union of every per-action narrowing.
 *
 * `core/actions/__tests__/status.test-d.ts` asserts this equals `ActionStatus`,
 * which is what proves every declared status is reachable from some action. A
 * status nothing can report is either a design mistake or a missing narrowing,
 * and both should fail rather than ship.
 */
export type ReachableActionStatus =
  | EvmDepositStatus
  | EvmWithdrawStatus
  | EvmDeployStatus
  | EvmVaultWithdrawStatus
  | EvmClaimStatus
  | EvmCancelWithdrawStatus
  | BtcDepositStatus
  | BtcDeployStatus
  | SolanaDepositStatus
  | SolanaWithdrawStatus
  | SuiWithdrawStatus
  | StarknetWithdrawStatus;
