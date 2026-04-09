import {
  Connection,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

import { ISolanaWalletProvider } from "../types";

// Helper function to send and confirm transactions
export async function sendAndConfirmTransaction({
  instruction,
  connection,
  provider,
  debugLabel = "Transaction",
  skipPreflight = false,
}: {
  instruction: Transaction | TransactionInstruction;
  connection: Connection;
  provider: ISolanaWalletProvider;
  debugLabel?: string;
  skipPreflight?: boolean;
}): Promise<{ signature: string; signedTransaction: Transaction }> {
  const transaction = new Transaction();
  transaction.add(instruction);
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = provider.publicKey;

  const signedTx = await provider.signTransaction(transaction);

  try {
    const signature = await connection.sendRawTransaction(
      signedTx.serialize(),
      {
        skipPreflight,
      },
    );

    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      "confirmed",
    );

    if (confirmation.value.err) {
      throw new Error(
        `${debugLabel} failed: ${JSON.stringify(confirmation.value.err)}`,
      );
    }

    return { signature, signedTransaction: signedTx };
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      "logs" in error
    ) {
      const logs = (error as { logs: string[] }).logs || [];
      throw new Error(
        `${debugLabel} error: ${error instanceof Error ? error.message : String(error)}\nLogs: ${JSON.stringify(logs)}`,
      );
    }
    throw error;
  }
}
