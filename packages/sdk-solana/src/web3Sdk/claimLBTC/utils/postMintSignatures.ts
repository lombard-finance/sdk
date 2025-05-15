import { Program } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { ISolanaWalletProvider } from 'types';
import { Lbtc } from '../../../idl/lbtc';
import { sendAndConfirmTransaction } from '../../../utils';
import { parseSignaturesFromProof } from './signatureUtils';

export const postMintSignatures = async ({
  connection,
  provider,
  program,
  configPDA,
  mintPayloadPDA,
  payloadHashArray,
  proofSignature,
}: {
  connection: Connection;
  provider: ISolanaWalletProvider;
  program: Program<Lbtc>;
  configPDA: PublicKey;
  mintPayloadPDA: PublicKey;
  payloadHashArray: number[];
  proofSignature: string;
}) => {
  const { signatures: parsedSignaturesUint8, indices } =
    parseSignaturesFromProof(proofSignature);

  if (parsedSignaturesUint8.length === 0 || indices.length === 0) {
    throw new Error('No valid signatures found in the proof');
  }

  // Convert Uint8Array[] to number[][]
  const signatures = parsedSignaturesUint8.map(sig => Array.from(sig));

  const postSignaturesIx = await program.methods
    .postMintSignatures(payloadHashArray, signatures, indices)
    .accounts({
      config: configPDA,
      // @ts-ignore -- type error from idl even though payload is required
      payload: mintPayloadPDA,
    })
    .transaction();
  return await sendAndConfirmTransaction({
    instruction: postSignaturesIx,
    connection,
    provider,
    debugLabel: 'Post Mint Signatures',
  });
};
