/**
 * Typed data builders for EIP-712 signatures.
 * Centralizes EIP-712 structure creation for stake and bake operations.
 */

import type { Address } from 'viem';

import type { ChainId } from '../../common/chains';
import type { ApprovalMode } from '../../defi/defi-registry';

/**
 * EIP-712 domain type definition.
 * Standard across all EIP-712 signatures.
 */
export const EIP712_DOMAIN_TYPES = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
] as const;

/**
 * EIP-712 Permit message type definition (EIP-2612).
 * Used for gasless token approvals.
 */
export const PERMIT_MESSAGE_TYPES = [
  { name: 'owner', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
] as const;

/**
 * EIP-712 Approve message type definition.
 * Used for traditional on-chain approvals (same structure as Permit).
 */
export const APPROVE_MESSAGE_TYPES = PERMIT_MESSAGE_TYPES;

/**
 * Parameters for building typed data.
 */
export interface TypedDataParams {
  /** Approval mode (determines primary type) */
  mode: ApprovalMode;
  /** User's account address */
  account: Address;
  /** Chain ID */
  chainId: ChainId;
  /** Token contract address (verifying contract) */
  verifyingContract: Address;
  /** EIP-712 domain name */
  domainName: string;
  /** EIP-712 domain version */
  domainVersion: string;
  /** Spender contract address */
  spender: Address;
  /** Amount to approve/permit (in base units) */
  value: bigint;
  /** Nonce for replay protection */
  nonce: bigint;
  /** Deadline timestamp (or 0 for no deadline) */
  deadline: bigint;
}

/**
 * Builds EIP-712 typed data structure for signatures.
 *
 * @param params - Typed data parameters
 * @returns EIP-712 typed data structure ready for signing
 *
 * @example
 * ```typescript
 * const typedData = buildTypedData({
 *   mode: 'permit',
 *   account: '0x...',
 *   chainId: 1,
 *   verifyingContract: '0x...',
 *   domainName: 'Lombard Staked Bitcoin',
 *   domainVersion: '1',
 *   spender: '0x...',
 *   value: 1000000n,
 *   nonce: 0n,
 *   deadline: 1234567890n,
 * });
 *
 * const signature = await walletClient.signTypedData(typedData);
 * ```
 */
export function buildTypedData(params: TypedDataParams) {
  const primaryType = params.mode === 'permit' ? 'Permit' : 'Approve';

  return {
    account: params.account,
    domain: {
      name: params.domainName,
      version: params.domainVersion,
      chainId: BigInt(params.chainId),
      verifyingContract: params.verifyingContract,
    },
    types: {
      EIP712Domain: EIP712_DOMAIN_TYPES,
      [primaryType]:
        params.mode === 'permit' ? PERMIT_MESSAGE_TYPES : APPROVE_MESSAGE_TYPES,
    },
    primaryType,
    message: {
      owner: params.account,
      spender: params.spender,
      value: params.value,
      nonce: params.nonce,
      deadline: params.deadline,
    },
  } as const;
}

/**
 * Serializes typed data to JSON string.
 * Handles BigInt serialization by converting to strings.
 *
 * @param typedData - Typed data structure from buildTypedData
 * @returns JSON string representation
 *
 * @example
 * ```typescript
 * const typedData = buildTypedData(params);
 * const json = serializeTypedData(typedData);
 * // Store or transmit JSON string
 * ```
 */
export function serializeTypedData(
  typedData: ReturnType<typeof buildTypedData>,
): string {
  return JSON.stringify(typedData, (_, v) =>
    typeof v === 'bigint' ? v.toString() : v,
  );
}
