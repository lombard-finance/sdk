/**
 * Deposit Status Utilities
 *
 * Centralized logic for determining deposit status based on notarization state,
 * confirmations, and other factors. This module provides a single source of truth
 * for deposit status that can be used by the SDK demo, apps/main, and other consumers.
 *
 * Status determination is based on both notarization status and block confirmations.
 * The notarization status from the backend is the primary source of truth for where
 * in the flow a deposit currently is.
 *
 * @module shared/deposits/depositStatus
 */

import {
  type Deposit,
  ENotarizationStatus,
  ESessionState,
} from '../../api-functions/getDepositsByAddress/getDepositsByAddress';
import { MIN_STAKE_AMOUNT_BTC } from '../../common/constants';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Number of confirmations required before a deposit can be claimed.
 * Production/Testnet: 6, Stage/Dev: 3
 */
export const REQUIRED_CONFIRMATIONS = 6;

/**
 * Minimum deposit amount that can be claimed (in BTC).
 * Deposits below this amount cannot be minted.
 *
 * @deprecated Use `MIN_STAKE_AMOUNT_BTC` from `@lombard.finance/sdk` instead.
 * This constant is an alias kept for backwards compatibility.
 */
export const MIN_CLAIM_AMOUNT_BTC = MIN_STAKE_AMOUNT_BTC;

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Possible deposit statuses - ordered by lifecycle
 */
export type DepositStatus =
  | 'pending_confirmations' // Waiting for BTC block confirmations
  | 'pending_notarization' // Confirmations complete, waiting for notarization service
  | 'claimable' // Notarization approved, ready to be claimed manually
  | 'claiming' // Claim transaction submitted
  | 'claimed' // Successfully claimed (has claimTxHash)
  | 'auto_claimed' // Claimed via GMP (cross-chain messaging)
  | 'expired' // Signature expired, needs re-auth
  | 'failed' // Notarization failed
  | 'restricted' // Sanctioned or restricted
  | 'too_small'; // Amount below minimum

/**
 * Status severity for UI styling
 */
export type StatusSeverity = 'info' | 'warning' | 'success' | 'error' | 'neutral';

/**
 * Status display configuration
 */
export interface DepositStatusDisplay {
  /** Human-readable label for the status */
  label: string;
  /** Severity level for styling */
  severity: StatusSeverity;
  /** Detailed description of the status */
  description: string;
  /** Whether the deposit is in a terminal state (claimed, failed, restricted) */
  isTerminal: boolean;
  /** Whether user action is required */
  requiresAction: boolean;
}

/**
 * Confirmation progress information
 */
export interface ConfirmationProgress {
  /** Current number of confirmations */
  current: number;
  /** Required number of confirmations */
  required: number;
  /** Percentage complete (0-100) */
  percentage: number;
  /** Whether enough confirmations have been received */
  isComplete: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Core Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate the number of confirmations for a deposit
 *
 * @param currentBlockHeight - Current Bitcoin block height
 * @param depositBlockHeight - Block height where deposit was confirmed
 * @returns Number of confirmations (0 if either height is missing)
 */
export function calcConfirmations(
  currentBlockHeight?: number,
  depositBlockHeight?: number,
): number {
  if (!depositBlockHeight || !currentBlockHeight) {
    return 0;
  }
  // Deposit block height counts as the first confirmation
  return Math.max(0, currentBlockHeight - depositBlockHeight + 1);
}

/**
 * Get confirmation progress for a deposit
 *
 * @param currentBlockHeight - Current Bitcoin block height
 * @param depositBlockHeight - Block height where deposit was confirmed
 * @param requiredConfirmations - Number of confirmations required (default: REQUIRED_CONFIRMATIONS)
 * @returns Confirmation progress info, or null if block heights unavailable
 */
export function getConfirmationProgress(
  currentBlockHeight?: number,
  depositBlockHeight?: number,
  requiredConfirmations: number = REQUIRED_CONFIRMATIONS,
): ConfirmationProgress | null {
  if (currentBlockHeight === undefined || depositBlockHeight === undefined) {
    return null;
  }

  const current = calcConfirmations(currentBlockHeight, depositBlockHeight);
  const percentage = Math.min(
    100,
    Math.round((current / requiredConfirmations) * 100),
  );

  return {
    current,
    required: requiredConfirmations,
    percentage,
    isComplete: current >= requiredConfirmations,
  };
}

/**
 * Determine the status of a deposit
 *
 * Logic priority:
 * 1. Sanctioned → restricted
 * 2. Already claimed → claimed
 * 3. GMP handled → auto_claimed  (definitive success, overrides expired/failed)
 * 4. Amount too small → too_small (permanent, re-auth won't help)
 * 5. Notarization failed → failed (terminal, overrides expired)
 * 6. Session expired → expired    (recoverable via re-auth)
 * 7. Based on notarization status + proof availability:
 *    - PENDING/SUBMITTED without enough confirmations → pending_confirmations
 *    - PENDING/SUBMITTED with confirmations → pending_notarization
 *    - SESSION_APPROVED with proof → claimable
 *    - SESSION_APPROVED without proof → pending_notarization (edge case)
 *
 * @param deposit - The deposit object from the SDK
 * @param currentBlockHeight - Current BTC block height (optional, enhances accuracy)
 * @param requiredConfirmations - Confirmations required (default: REQUIRED_CONFIRMATIONS)
 * @returns The deposit status
 */
export function getDepositStatus(
  deposit: Deposit,
  currentBlockHeight?: number,
  requiredConfirmations: number = REQUIRED_CONFIRMATIONS,
): DepositStatus {
  // 1. Check for sanctioned/restricted first
  if (deposit.sanctioned) {
    return 'restricted';
  }

  // 2. Check if already claimed
  if (deposit.isClaimed || deposit.claimTxHash) {
    return 'claimed';
  }

  // 3. Check for GMP auto-claim (definitive success, overrides expired/failed)
  if (
    deposit.notarizationStatus ===
    ENotarizationStatus.NOTARIZATION_STATUS_GMP_HANDLED
  ) {
    return 'auto_claimed';
  }

  // 4. Check if amount is too small (permanent, re-auth won't help)
  const amountBtc = deposit.amount?.toNumber?.() ?? Number(deposit.amount);
  if (amountBtc > 0 && amountBtc < MIN_STAKE_AMOUNT_BTC) {
    return 'too_small';
  }

  // 5. Check for notarization failure (terminal, overrides expired)
  if (
    deposit.notarizationStatus ===
    ENotarizationStatus.NOTARIZATION_STATUS_FAILED
  ) {
    return 'failed';
  }

  // 6. Check if the notarization session has expired (recoverable via re-auth)
  if (deposit.sessionState === ESessionState.SESSION_STATE_EXPIRED) {
    return 'expired';
  }

  // 7. Determine status based on notarization status and proof availability
  const hasProof = !!deposit.proof && !!deposit.rawPayload;
  const notarizationStatus = deposit.notarizationStatus;

  // Check confirmations only if we have block height data
  const confirmations = calcConfirmations(
    currentBlockHeight,
    deposit.blockHeight,
  );
  const hasEnoughConfirmations =
    currentBlockHeight === undefined ||
    confirmations >= requiredConfirmations;

  switch (notarizationStatus) {
    case ENotarizationStatus.NOTARIZATION_STATUS_PENDING:
    case ENotarizationStatus.NOTARIZATION_STATUS_SUBMITTED:
      // Still in notarization queue
      // If we know block height and not enough confirmations, show that
      if (currentBlockHeight !== undefined && !hasEnoughConfirmations) {
        return 'pending_confirmations';
      }
      // Otherwise, we're waiting for notarization
      return 'pending_notarization';

    case ENotarizationStatus.NOTARIZATION_STATUS_SESSION_APPROVED:
      // Notarization approved
      if (hasProof) {
        return 'claimable';
      }
      // Edge case: approved but no proof yet (should be rare)
      return 'pending_notarization';

    case ENotarizationStatus.NOTARIZATION_STATUS_UNSPECIFIED:
    default:
      // Unknown status - check confirmations if we can
      if (currentBlockHeight !== undefined && !hasEnoughConfirmations) {
        return 'pending_confirmations';
      }
      return 'pending_notarization';
  }
}

/**
 * Get display configuration for a deposit status
 *
 * @param status - The deposit status
 * @returns Display configuration with label, severity, and description
 */
export function getDepositStatusDisplay(
  status: DepositStatus,
): DepositStatusDisplay {
  switch (status) {
    case 'pending_confirmations':
      return {
        label: 'Pending Confirmations',
        severity: 'warning',
        description: `Waiting for Bitcoin block confirmations (${REQUIRED_CONFIRMATIONS} required)`,
        isTerminal: false,
        requiresAction: false,
      };
    case 'pending_notarization':
      return {
        label: 'Pending Notarization',
        severity: 'info',
        description:
          'Confirmations complete, waiting for notarization service to generate proof',
        isTerminal: false,
        requiresAction: false,
      };
    case 'claimable':
      return {
        label: 'Claimable',
        severity: 'success',
        description: 'Ready to mint - proof available, claim to receive tokens',
        isTerminal: false,
        requiresAction: true,
      };
    case 'claiming':
      return {
        label: 'Claiming',
        severity: 'info',
        description: 'Claim transaction in progress',
        isTerminal: false,
        requiresAction: false,
      };
    case 'claimed':
      return {
        label: 'Claimed',
        severity: 'neutral',
        description: 'Tokens have been minted to your address',
        isTerminal: true,
        requiresAction: false,
      };
    case 'auto_claimed':
      return {
        label: 'Auto-Claimed',
        severity: 'success',
        description: 'Automatically claimed via cross-chain messaging (GMP)',
        isTerminal: true,
        requiresAction: false,
      };
    case 'expired':
      return {
        label: 'Expired',
        severity: 'error',
        description: 'Fee signature expired, requires re-authorization',
        isTerminal: false,
        requiresAction: true,
      };
    case 'failed':
      return {
        label: 'Failed',
        severity: 'error',
        description: 'Notarization failed - contact support',
        isTerminal: true,
        requiresAction: false,
      };
    case 'restricted':
      return {
        label: 'Restricted',
        severity: 'error',
        description: 'This deposit is restricted or sanctioned',
        isTerminal: true,
        requiresAction: false,
      };
    case 'too_small':
      return {
        label: 'Too Small',
        severity: 'neutral',
        description: `Amount below minimum claimable amount (${MIN_STAKE_AMOUNT_BTC} BTC)`,
        isTerminal: true,
        requiresAction: false,
      };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a deposit can be claimed manually
 *
 * @param deposit - The deposit object
 * @param currentBlockHeight - Current BTC block height (optional)
 * @returns True if the deposit is in claimable state
 */
export function isDepositClaimable(
  deposit: Deposit,
  currentBlockHeight?: number,
): boolean {
  return getDepositStatus(deposit, currentBlockHeight) === 'claimable';
}

/**
 * Check if a deposit is in a pending state (confirmations or notarization)
 *
 * @param deposit - The deposit object
 * @param currentBlockHeight - Current BTC block height (optional)
 * @returns True if deposit is pending
 */
export function isDepositPending(
  deposit: Deposit,
  currentBlockHeight?: number,
): boolean {
  const status = getDepositStatus(deposit, currentBlockHeight);
  return (
    status === 'pending_confirmations' || status === 'pending_notarization'
  );
}

/**
 * Check if a deposit is in a terminal state (no further action possible)
 *
 * @param deposit - The deposit object
 * @param currentBlockHeight - Current BTC block height (optional)
 * @returns True if deposit is in terminal state
 */
export function isDepositTerminal(
  deposit: Deposit,
  currentBlockHeight?: number,
): boolean {
  const status = getDepositStatus(deposit, currentBlockHeight);
  const display = getDepositStatusDisplay(status);
  return display.isTerminal;
}

/**
 * Check if a deposit requires user action
 *
 * @param deposit - The deposit object
 * @param currentBlockHeight - Current BTC block height (optional)
 * @returns True if user action is required
 */
export function depositRequiresAction(
  deposit: Deposit,
  currentBlockHeight?: number,
): boolean {
  const status = getDepositStatus(deposit, currentBlockHeight);
  const display = getDepositStatusDisplay(status);
  return display.requiresAction;
}

