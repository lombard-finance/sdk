import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { SolanaProviderInterface } from '../types';

/**
 * Create or get an associated token account for a given mint and owner
 *
 * @param provider Solana wallet provider
 * @param connection Solana connection
 * @param ownerAddress Address of the token account owner
 * @param mintAddress Address of the token mint
 * @returns The associated token account address
 */
export async function createOrGetAssociatedTokenAccount({
  provider,
  connection,
  ownerAddress,
  mintAddress,
}: {
  provider: SolanaProviderInterface;
  connection: Connection;
  ownerAddress: string;
  mintAddress: string;
}): Promise<string> {
  // Convert addresses to PublicKey objects
  const mintPubkey = new PublicKey(mintAddress);
  const ownerPubkey = new PublicKey(ownerAddress);

  // Get the associated token address
  const associatedTokenAddress = await getAssociatedTokenAddress(
    mintPubkey,
    ownerPubkey,
    false, // allowOwnerOffCurve
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  // Check if account exists
  try {
    const tokenAccount = await getAccount(
      connection,
      associatedTokenAddress,
      'confirmed',
      TOKEN_PROGRAM_ID,
    );

    return tokenAccount.address.toBase58();
  } catch (error) {
    // Create token account transaction
    const transaction = new Transaction();

    // Create instruction to create associated token account
    const createATAInstruction = createAssociatedTokenAccountInstruction(
      provider.publicKey, // payer
      associatedTokenAddress, // associatedToken
      ownerPubkey, // owner
      mintPubkey, // mint
      TOKEN_PROGRAM_ID, // token program id
      ASSOCIATED_TOKEN_PROGRAM_ID, // associated token program id
    );

    transaction.add(createATAInstruction);

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = provider.publicKey;

    // Sign transaction
    const signedTx = await provider.signTransaction(transaction);

    // Send transaction
    const signature = await connection.sendRawTransaction(signedTx.serialize());

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(
      signature,
      'confirmed',
    );

    if (confirmation.value.err) {
      throw new Error(
        `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
      );
    }

    return associatedTokenAddress.toBase58();
  }
}
