import { Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

import type { Lbtc } from '../../../idl/lbtc';

/**
 * Status of a mint payload on-chain
 */
export interface PayloadStatus {
  /**
   * Whether the payload exists on-chain
   */
  exists: boolean;
  /**
   * Whether the payload has been signed (signatures posted)
   */
  isSigned: boolean;
  /**
   * Whether the LBTC tokens have been minted
   */
  isMinted: boolean;
}

/**
 * Checks the status of a mint payload on the Solana blockchain
 *
 * @param program Anchor program instance
 * @param mintPayloadPDA The PDA address where the mint payload is stored
 * @param debugLog Debug logging function
 * @returns The status of the payload
 */
export async function checkPayloadStatus(
  program: Program<Lbtc>,
  mintPayloadPDA: PublicKey,
  debugLog: (...args: unknown[]) => void,
): Promise<PayloadStatus> {
  try {
    const payloadAccount =
      await program.account.mintPayload.fetch(mintPayloadPDA);

    if (!payloadAccount) {
      return { exists: false, isSigned: false, isMinted: false };
    }

    const isSigned = Array.isArray(payloadAccount.signed)
      ? payloadAccount.signed.every((signed: boolean) => signed === true)
      : false;

    return {
      exists: true,
      isSigned,
      isMinted: !!payloadAccount.minted,
    };
  } catch (error) {
    debugLog('Error checking payload status:', error);
    return { exists: false, isSigned: false, isMinted: false };
  }
}
