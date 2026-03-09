import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddress,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';

import { ISolanaWalletProvider } from '../types';

/**
 * Determine the token program that owns a given mint account.
 * Returns TOKEN_2022_PROGRAM_ID for Token-2022 mints, TOKEN_PROGRAM_ID otherwise.
 */
export async function getTokenProgramForMint(
  connection: Connection,
  mintAddress: PublicKey,
): Promise<PublicKey> {
  const accountInfo = await connection.getAccountInfo(mintAddress);

  if (!accountInfo) {
    throw new Error(`Mint account not found: ${mintAddress.toBase58()}`);
  }

  if (accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    return TOKEN_2022_PROGRAM_ID;
  }

  if (accountInfo.owner.equals(TOKEN_PROGRAM_ID)) {
    return TOKEN_PROGRAM_ID;
  }

  throw new Error(
    `Unsupported mint owner ${accountInfo.owner.toBase58()} for ${mintAddress.toBase58()}`,
  );
}

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
  provider: ISolanaWalletProvider;
  connection: Connection;
  ownerAddress: string;
  mintAddress: string;
}): Promise<string> {
  const mintPubkey = new PublicKey(mintAddress);
  const ownerPubkey = new PublicKey(ownerAddress);

  const tokenProgramId = await getTokenProgramForMint(connection, mintPubkey);

  const associatedTokenAddress = await getAssociatedTokenAddress(
    mintPubkey,
    ownerPubkey,
    false,
    tokenProgramId,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  try {
    const tokenAccount = await getAccount(
      connection,
      associatedTokenAddress,
      'confirmed',
      tokenProgramId,
    );

    return tokenAccount.address.toBase58();
  } catch {
    const transaction = new Transaction();

    const createATAInstruction = createAssociatedTokenAccountInstruction(
      provider.publicKey,
      associatedTokenAddress,
      ownerPubkey,
      mintPubkey,
      tokenProgramId,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    transaction.add(createATAInstruction);

    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = provider.publicKey;

    const signedTx = await provider.signTransaction(transaction);

    const signature = await connection.sendRawTransaction(
      signedTx.serialize(),
      { skipPreflight: true },
    );

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
