import { Connection, SendOptions, Transaction } from '@solana/web3.js';
import { SolanaProviderInterface } from '../types'; // Assuming SolanaProviderInterface is defined here

/**
 * Signs, sends, and confirms a transaction.
 *
 * @param connection Solana connection object
 * @param transaction Transaction to send
 * @param provider Wallet provider implementing SolanaProviderInterface
 * @param debugLog Optional debug logging function
 * @param options Optional SendOptions for sendRawTransaction
 * @returns Transaction signature
 * @throws Error if transaction fails confirmation
 */
export async function sendAndConfirmTransaction(
  connection: Connection,
  transaction: Transaction,
  provider: SolanaProviderInterface,
  debugLog: (...args: unknown[]) => void = console.log, // Default to console.log
  options?: SendOptions,
): Promise<string> {
  if (!provider.publicKey) {
    throw new Error('Wallet provider public key not found.');
  }
  if (!provider.signTransaction) {
    throw new Error('Wallet provider does not support signTransaction.');
  }

  transaction.feePayer = provider.publicKey;
  debugLog('Fetching latest blockhash for transaction...');
  transaction.recentBlockhash = (
    await connection.getLatestBlockhash()
  ).blockhash;
  debugLog(`Blockhash: ${transaction.recentBlockhash}`);
  debugLog(`Fee Payer: ${transaction.feePayer.toBase58()}`);

  debugLog('Requesting transaction signature from provider...');
  const signedTransaction = await provider.signTransaction(transaction);

  debugLog('Sending signed transaction...');
  const signature = await connection.sendRawTransaction(
    signedTransaction.serialize(),
    options,
  );
  debugLog('Transaction sent with signature:', signature);

  debugLog('Confirming transaction...');
  const confirmation = await connection.confirmTransaction(
    signature,
    'confirmed', // Use 'confirmed' commitment level for confirmation
  );
  debugLog('Transaction confirmation status:', confirmation);

  if (confirmation.value.err) {
    throw new Error(
      `Transaction failed confirmation: ${JSON.stringify(confirmation.value.err)}`,
    );
  }

  debugLog('Transaction confirmed successfully.');
  return signature;
}
