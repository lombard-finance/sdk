import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

import { MintPayload } from '../common/mintPayload';

export const verifyMatchingRecipient = async (
  mint: PublicKey,
  mintPayload: MintPayload,
  recipientAddress: string,
) => {
  const tokenAddress = await getAssociatedTokenAddress(
    mint,
    new PublicKey(recipientAddress),
    false,
    TOKEN_PROGRAM_ID,
  );

  if (!mintPayload.recipientPubKey().equals(tokenAddress)) {
    throw new Error(
      `Recipient mismatch: ${mintPayload.recipientPubKey().toBase58()} vs ${tokenAddress.toBase58()}`,
    );
  }
};
