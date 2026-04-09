import { oft } from "@layerzerolabs/oft-v2-solana-sdk";
import { Env } from "@lombard.finance/sdk-common";
import {
  publicKey as umiPublicKey,
  Signer,
  WrappedInstruction,
} from "@metaplex-foundation/umi";
import { createSignerFromWalletAdapter } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { toWeb3JsInstruction } from "@metaplex-foundation/umi-web3js-adapters";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  PublicKey as Web3PublicKey,
  Transaction,
} from "@solana/web3.js";
import BigNumber from "bignumber.js";

import {
  envToNetwork,
  getConfig,
  getLBTCAddress,
  getRpcEndpoint,
} from "../const/getConfig";
import { getConnection } from "../const/rpcUrls";
import { ISolanaWalletProvider } from "../types";
import {
  getMinimalUmiInstance,
  getRecipientBytes32,
  validateBridgeAmount,
} from "../utils/bridgeUtils";
import { quoteBridgeFee } from "./quoteBridgeFee";

const LBTC_DECIMALS = 8;
const BRDIGE_COMPUTE_UNITS = 400000;

interface SendBridgeTransactionParams {
  /** Solana wallet provider conforming to ISolanaWalletProvider */
  provider: ISolanaWalletProvider;
  /** The LayerZero environment ('prod', 'stage', 'testnet') */
  env: Env;
  /** LayerZero Endpoint ID for the destination chain */
  destinationLzEndpointId: number;
  /** Amount to bridge (in human-readable LBTC format) */
  amount: string;
  /** Recipient address on the destination chain */
  recipientAddress: string;
  /** Optional: Minimum amount to receive on destination (smallest unit, defaults to 99.9% of amount) */
  minAmountLd?: bigint;
  /** Optional: LayerZero options bytes (often used for gas params on dest) */
  options?: Uint8Array;
}

/**
 * Sends a LayerZero bridge transaction for LBTC from Solana.
 *
 * @param params Parameters for sending the bridge transaction.
 * @returns A promise resolving to the Solana transaction signature.
 */
export async function sendBridgeTransaction({
  provider,
  env,
  destinationLzEndpointId,
  amount,
  recipientAddress,
  minAmountLd: inputMinAmountLd,
  options = new Uint8Array(),
}: SendBridgeTransactionParams): Promise<string> {
  if (!provider.publicKey) {
    throw new Error("Wallet provider not connected.");
  }
  if (!provider.signTransaction) {
    throw new Error("Wallet provider does not support signing transactions.");
  }

  if (!destinationLzEndpointId) {
    throw new Error("Destination chain LayerZero Endpoint ID is required.");
  }

  const network = envToNetwork[env];
  const rpcUrl = getRpcEndpoint(network);
  const umi = getMinimalUmiInstance(rpcUrl);
  const connection = getConnection(network, rpcUrl);
  const config = getConfig(env);
  const lbtcMintAddress = getLBTCAddress(network);
  const lbtcMintPublicKey = new Web3PublicKey(lbtcMintAddress);
  const oftProgramId = umiPublicKey(config.lzOftAdapter);
  const tokenEscrowPublicKey = umiPublicKey(config.lzEscrow);
  const mintPublicKeyUmi = umiPublicKey(lbtcMintAddress);

  const sourceTokenAccount = getAssociatedTokenAddressSync(
    lbtcMintPublicKey,
    provider.publicKey,
    false,
  );

  const sourceTokenAccountUmi = umiPublicKey(sourceTokenAccount.toBase58());
  const amountBn = new BigNumber(amount).shiftedBy(LBTC_DECIMALS);

  validateBridgeAmount(amountBn);

  const amountLd = BigInt(amountBn.toFixed(0));
  const minAmountLd = inputMinAmountLd ?? (amountLd * 999n) / 1000n;

  const quote = await quoteBridgeFee({
    env,
    provider,
    sendParams: {
      dstEid: destinationLzEndpointId,
      to: recipientAddress,
      amountLD: Number(amountLd),
      minAmountLD: 1,
      extraOptions: "",
      composeMsg: "",
      oftCmd: "",
    },
  });

  const nativeFee = quote.nativeFee;
  const lzTokenFee = quote.lzTokenFee;

  try {
    const signer: Signer = createSignerFromWalletAdapter({
      publicKey: provider.publicKey,
      signMessage: async (msg: Uint8Array) => {
        const { signature } = await provider.signMessage(msg);
        return new Uint8Array(signature);
      },
      signTransaction: provider.signTransaction,
      signAllTransactions: provider.signAllTransactions,
    });

    const recipientBytes32 = getRecipientBytes32(recipientAddress);

    const sendInstructionWrapped: WrappedInstruction = await oft.send(
      umi.rpc,
      {
        payer: signer,
        tokenMint: mintPublicKeyUmi,
        tokenEscrow: tokenEscrowPublicKey,
        tokenSource: sourceTokenAccountUmi,
      },
      {
        to: recipientBytes32,
        dstEid: destinationLzEndpointId,
        amountLd: amountLd,
        minAmountLd: minAmountLd,
        options: options,
        composeMsg: undefined,
        nativeFee: BigInt(nativeFee),
        lzTokenFee: BigInt(lzTokenFee),
      },
      {
        oft: oftProgramId,
      },
    );

    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: BRDIGE_COMPUTE_UNITS,
    });

    const web3Instruction = toWeb3JsInstruction(
      sendInstructionWrapped.instruction,
    );
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    const transaction = new Transaction()
      .add(modifyComputeUnits)
      .add(web3Instruction);
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = provider.publicKey;

    const signedTransaction = await provider.signTransaction(transaction);

    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize(),
      { skipPreflight: false },
    );

    const confirmation = await connection.confirmTransaction(
      {
        signature: signature,
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight,
      },
      "confirmed",
    );

    if (confirmation.value.err) {
      throw new Error(
        `Solana transaction failed to confirm: ${JSON.stringify(confirmation.value.err)}`,
      );
    }

    return signature;
  } catch (error) {
    if (error instanceof Error) {
      handleError(error);
    }
    throw new Error(
      "An unknown error occurred while sending the LayerZero bridge transaction.",
    );
  }
}

const handleError = (error: Error) => {
  console.error("Error sending Solana LayerZero transaction:", error);

  if (
    error.message.includes("slippage") ||
    error.message.includes("MinimumAmount")
  ) {
    throw new Error(
      "Bridge failed due to slippage or minimum amount not met. Please try again or adjust parameters.",
    );
  }
  if (error.message.includes("insufficient funds")) {
    throw new Error(
      "Insufficient SOL balance to cover transaction and bridge fees.",
    );
  }
  if (
    error.message.includes("Readonly Signer") ||
    error.message.includes("identity")
  ) {
    throw new Error(
      "Wallet connection issue: Readonly signer detected or identity not set. Ensure wallet is fully connected.",
    );
  }
  throw new Error(
    `Failed to send LayerZero bridge transaction: ${error.message}`,
  );
};
