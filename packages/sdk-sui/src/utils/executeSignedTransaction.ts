/**
 * Transaction submission over gRPC.
 *
 * @module utils/executeSignedTransaction
 */

import type { SuiClientTypes } from '@mysten/sui/client';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { fromBase64 } from '@mysten/sui/utils';

/** The executed transaction: digest, top-level status, parsed effects. */
export type ISuiExecutedTransaction = SuiClientTypes.Transaction<{
  effects: true;
}>;

/**
 * Executes a wallet-signed transaction. The wallet hands the transaction bytes
 * back base64-encoded, and the gRPC core client takes them raw.
 */
export async function executeSignedTransaction(
  client: SuiGrpcClient,
  signed: { bytes: string; signature: string },
): Promise<ISuiExecutedTransaction> {
  const result = await client.core.executeTransaction({
    transaction: fromBase64(signed.bytes),
    signatures: [signed.signature],
    include: { effects: true },
  });

  // Both arms carry the executed transaction. `FailedTransaction` is a Move
  // level failure that still landed on chain; the JSON-RPC client used to hand
  // that back as a response too, with the failure in its status, rather than
  // throw.
  return result.$kind === 'Transaction'
    ? result.Transaction
    : result.FailedTransaction;
}
