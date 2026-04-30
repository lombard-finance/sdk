/**
 * Status constants for all action types
 *
 * These constants replace magic strings throughout the codebase
 * and provide type-safe status values.
 *
 * ## Error Design
 *
 * Note: There is NO 'failed' status. Error handling is separate from status:
 * - `status` = "What step are you at?" (flow position)
 * - `error` = "Did something go wrong?" (Error | null)
 * - `isFailed` = Derived from `error !== null`
 *
 * When an error occurs, status stays at the step where it happened.
 * This allows:
 * 1. Knowing WHERE the error occurred (status tells you)
 * 2. Easy retry - just call the method again
 * 3. Simpler state machine - status only flows forward
 */

// ═══════════════════════════════════════════════════════════════════════════
// BTC Actions - Unified Status
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Unified BTC Action Status
 *
 * Single source of truth for all BTC action statuses.
 * All BTC actions (Stake, Deposit, StakeAndDeploy, DepositAndDeploy) use this.
 *
 * Status represents "what step are you at" - no transitional statuses.
 * Use `isLoading` for operation-in-progress state.
 *
 * ## Flow Examples
 *
 * **BtcStake/BtcDeposit (to Ethereum):**
 * IDLE → NEEDS_FEE_AUTHORIZATION → READY → ADDRESS_READY
 *
 * **BtcStake/BtcDeposit (to non-Ethereum):**
 * IDLE → NEEDS_ADDRESS_CONFIRMATION → READY → ADDRESS_READY
 *
 * **BtcStakeAndDeploy/BtcDepositAndDeploy:**
 * IDLE → NEEDS_DEPLOY_AUTHORIZATION → READY → ADDRESS_READY
 */
export const BtcActionStatus = {
  /** Initial state - ready for prepare() */
  IDLE: 'idle',

  // Authorization states (mutually exclusive - action uses one based on config)
  /** User needs to sign fee authorization (EVM stake/deposit to Ethereum) */
  NEEDS_FEE_AUTHORIZATION: 'needs_fee_authorization',
  /** User needs to confirm destination address (non-Ethereum destinations) */
  NEEDS_ADDRESS_CONFIRMATION: 'needs_address_confirmation',
  /** User needs to sign vault deploy authorization (stake-and-deploy, deposit-and-deploy) */
  NEEDS_DEPLOY_AUTHORIZATION: 'needs_deploy_authorization',

  /** Authorization complete - ready to generate address */
  READY: 'ready',

  /** Deposit address generated - awaiting BTC deposit */
  ADDRESS_READY: 'address_ready' } as const;

export type BtcActionStatus =
  (typeof BtcActionStatus)[keyof typeof BtcActionStatus];

/**
 * EVM operation statuses (Deposit, Stake, Deploy, Unstake, Redeem)
 *
 * Simplified - use isLoading for operation-in-progress.
 *
 * ## Flow Examples
 *
 * **EVM Unstake (LBTC → BTC.b on Ethereum/Sepolia):**
 * IDLE → NEEDS_FEE_AUTHORIZATION → READY → COMPLETED
 *
 * **EVM Unstake (LBTC → BTC.b on Base/BSC - subsidized):**
 * IDLE → READY → COMPLETED
 *
 * **EVM Redeem (BTC.b → BTC on Ethereum/Sepolia):**
 * IDLE → NEEDS_FEE_AUTHORIZATION → READY → COMPLETED
 */
export const EvmOperationStatus = {
  IDLE: 'idle',
  /** User needs to sign fee authorization (Ethereum/Sepolia only) */
  NEEDS_FEE_AUTHORIZATION: 'needs_fee_authorization',
  /** User needs to approve token spending */
  NEEDS_APPROVAL: 'needs-approval',
  READY: 'ready',
  CONFIRMING: 'confirming',
  COMPLETED: 'completed' } as const;

export type EvmOperationStatus =
  (typeof EvmOperationStatus)[keyof typeof EvmOperationStatus];

/**
 * Non-EVM operation statuses
 *
 * Shared by all non-EVM actions (Solana Stake/Unstake/Redeem, Sui Unstake,
 * Starknet Unstake). Non-EVM flows don't require fee authorization or token
 * approval, so the state machine is a simple IDLE → READY → CONFIRMING → COMPLETED.
 */
export const NonEvmOperationStatus = {
  IDLE: 'idle',
  READY: 'ready',
  CONFIRMING: 'confirming',
  COMPLETED: 'completed' } as const;

export type NonEvmOperationStatus =
  (typeof NonEvmOperationStatus)[keyof typeof NonEvmOperationStatus];
