/**
 * Transaction submission over gRPC.
 *
 * @module utils/executeSignedTransaction
 */

import type { Experimental_SuiClientTypes } from '@mysten/sui/experimental';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { fromBase64 } from '@mysten/sui/utils';

/** The executed transaction, digest and effects included. */
export type ISuiExecutedTransaction =
  Experimental_SuiClientTypes.TransactionResponse;

/**
 * Executes a wallet-signed transaction. The wallet hands the transaction bytes
 * back base64-encoded, and the gRPC core client takes them raw.
 */
export async function executeSignedTransaction(
  client: SuiGrpcClient,
  signed: { bytes: string; signature: string },
): Promise<ISuiExecutedTransaction> {
  const { transaction } = await client.core.executeTransaction({
    transaction: fromBase64(signed.bytes),
    signatures: [signed.signature],
  });

  return transaction;
}
