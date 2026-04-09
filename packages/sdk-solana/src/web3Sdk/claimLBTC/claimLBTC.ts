import { AnchorProvider, Program, setProvider } from "@coral-xyz/anchor";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";

import { MintPayload } from "../../common/mintPayload";
import { getConfig, networkToEnv } from "../../const/getConfig";
import { getConnection } from "../../const/rpcUrls";
import { getLbtcIdl } from "../../idl/getLbtcIdl";
import { ISolanaWalletProvider, SolanaNetwork } from "../../types";
import { sendAndConfirmTransaction } from "../../utils";
import { createDebugLogger } from "../../utils/createDebugLogger";
import { verifyMatchingRecipient } from "../../utils/recipients";
import { createOrGetAssociatedTokenAccount } from "../../utils/tokenAccount";
import { checkPayloadStatus } from "./utils";
import { generateDepositId } from "./utils/generateDepositId";
import { postMintSignatures } from "./utils/postMintSignatures";

export const ALREADY_MINTED_TX_HASH = "ALREADY_MINTED";

/**
 * Parameters for claiming LBTC tokens on Solana
 */
export interface ClaimLBTCParams {
  /**
   * Address to receive the LBTC tokens
   */
  recipientAddress: string;
  /**
   * Amount of LBTC to claim in base units
   */
  amount: string;
  /**
   * Network to use
   */
  network: SolanaNetwork;
  /**
   * Proof signature from the backend
   */
  proofSignature: string;
  /**
   * Raw payload data
   */
  rawPayload: string;
  /**
   * Optional RPC endpoint to use
   */
  rpcUrl?: string;
  /**
   * Enable verbose debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Claim LBTC tokens on Solana using a three-step process:
 * 1. Create mint payload
 * 2. Post mint signatures
 * 3. Mint from payload
 *
 * @param provider Solana wallet provider
 * @param params Claim parameters
 * @returns Transaction signature
 */
export async function claimLBTC(
  provider: ISolanaWalletProvider,
  params: ClaimLBTCParams,
): Promise<string> {
  const {
    recipientAddress,
    network,
    proofSignature,
    rawPayload,
    rpcUrl,
    debug = false,
  } = params;
  const { debugLog, printLogs } = createDebugLogger({ debug });

  try {
    if (!provider.publicKey) {
      throw new Error("Wallet not found");
    }

    const config = getConfig(networkToEnv[network]);
    const connection = getConnection(network, rpcUrl);

    const wallet = {
      publicKey: new PublicKey(provider.publicKey),
      signTransaction: provider.signTransaction,
      signAllTransactions: provider.signAllTransactions,
    };
    const anchorProvider = new AnchorProvider(connection, wallet, {});
    setProvider(anchorProvider);
    const program = new Program(getLbtcIdl(network), anchorProvider);

    const mint = new PublicKey(config.lbtcTokenMint);
    const programId = new PublicKey(config.lbtcProgramId);
    const lzMultisig = new PublicKey(config.lzMultisig);
    const mintPayload = new MintPayload(rawPayload);
    const [mintPayloadPDA] = PublicKey.findProgramAddressSync(
      [mintPayload.hashAsBytes()],
      programId,
    );
    const [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("lbtc_config")],
      programId,
    );
    const [tokenAuth] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_authority")],
      programId,
    );
    const payloadHashArray = Array.from(mintPayload.hashAsBytes());

    await verifyMatchingRecipient(mint, mintPayload, recipientAddress);

    const payloadStatus = await checkPayloadStatus(
      program,
      mintPayloadPDA,
      debugLog,
    );

    if (payloadStatus.isMinted) {
      return ALREADY_MINTED_TX_HASH;
    }

    await createOrGetAssociatedTokenAccount({
      provider,
      connection,
      ownerAddress: recipientAddress,
      mintAddress: config.lbtcTokenMint,
    });

    // Step 1: Create Mint Payload (if it doesn't exist)
    if (!payloadStatus.exists) {
      debugLog("Adding Create Mint Payload instruction...");
      const createPayloadIx = await program.methods
        .createMintPayload(payloadHashArray, Array.from(mintPayload.bytes()))
        .accounts({
          payer: provider.publicKey,
          config: configPDA,
          // @ts-ignore -- type error from idl even though payload is required
          payload: mintPayloadPDA,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      await sendAndConfirmTransaction({
        instruction: createPayloadIx,
        connection,
        provider,
        debugLabel: "Create Mint Payload",
      });
    } else {
      debugLog("Mint payload already exists, skipping create instruction.");
    }

    // Step 2: Post Mint Signatures (if not already signed)
    if (!payloadStatus.isSigned) {
      await postMintSignatures({
        connection,
        provider,
        program,
        configPDA,
        mintPayloadPDA,
        payloadHashArray,
        proofSignature,
      });
    } else {
      debugLog("Payload already signed, skipping post signatures instruction.");
    }

    // Extract necessary data from the payload
    const recipient = new PublicKey(recipientAddress);
    const recipientATA = await getAssociatedTokenAddress(mint, recipient);
    const amount = mintPayload.amount.startsWith("0x")
      ? BigInt(mintPayload.amount)
      : BigInt(`0x${mintPayload.amount}`);
    const depositId = generateDepositId(
      recipientATA,
      amount,
      mintPayload.txId,
      Number(mintPayload.vout),
    );
    const DEPOSIT_SEED = Buffer.from("deposit");
    const [depositPDA] = config.bascule
      ? PublicKey.findProgramAddressSync(
          [DEPOSIT_SEED, depositId],
          new PublicKey(config.bascule),
        )
      : [];

    // Step 3: Mint From Payload (Always add if not already minted)
    const mintTx = await program.methods
      .mintFromPayload(payloadHashArray)
      .accounts({
        config: configPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        recipient: recipientATA,
        mint,
        mintAuthority: lzMultisig,
        tokenAuthority: tokenAuth,
        payload: mintPayloadPDA,
        // @ts-ignore -- type error from idl even though payload is required
        bascule: config.bascule,
        basculeData: config.basculeData,
        deposit: depositPDA,
        systemProgram: SystemProgram.programId,
        signer: provider.publicKey,
      })
      .transaction();

    const { signature } = await sendAndConfirmTransaction({
      instruction: mintTx,
      connection,
      provider,
      debugLabel: "Mint From Payload",
    });

    return signature;
  } catch (error: unknown) {
    if (error instanceof Error) {
      error.message = `${error.message}\n\nDebug logs:\n${printLogs()}`;
    }
    throw error;
  }
}
