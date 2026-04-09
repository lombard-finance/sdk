import { addressToBytes32 } from "@layerzerolabs/lz-v2-utilities";
import { Umi } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import BigNumber from "bignumber.js";
import bs58 from "bs58";

const umiInstances: Record<string, Umi> = {};
export function getMinimalUmiInstance(rpcUrl: string): Umi {
  if (!umiInstances[rpcUrl]) {
    umiInstances[rpcUrl] = createUmi(rpcUrl);
  }
  return umiInstances[rpcUrl];
}

export const getRecipientBytes32 = (recipientAddress: string) => {
  let recipientBytes32: Uint8Array;
  try {
    const cleanedRecipientAddress = recipientAddress.startsWith("0x")
      ? recipientAddress.substring(2)
      : recipientAddress;
    recipientBytes32 = addressToBytes32(`0x${cleanedRecipientAddress}`);
  } catch (e) {
    console.error("Error converting recipient address:", recipientAddress, e);
    throw new Error(
      `Invalid recipient address format for destination chain: ${recipientAddress}. Ensure it's a valid hex address.`,
    );
  }
  return recipientBytes32;
};

export const validateBridgeAmount = (amount: BigNumber) => {
  if (amount.isNaN() || amount.isLessThanOrEqualTo(0)) {
    throw new Error(`Invalid amount for bridging: ${amount}`);
  }
};

/**
 * Decodes a 32-byte hex-encoded Solana address (from LayerZero payloads)
 * into its standard Base58 string representation.
 *
 * @param {string} addressBytes32 - The 32-byte address as a hex string.
 *   Example: "7ef4ff7a40...d40e"
 *
 * @returns {string} The decoded Solana address in Base58 format.
 *   Example: "9Yb3kJXMMHUN9ry1w7UTFETe1zuM2pGzM66d4aBjtMCh"
 *
 * @example
 * ```ts
 * const recipient = parseOFTRecipient("7ef4ff7a401e49fed12f834338ddcd7aec59b306fb6dcf567ee32370a627d40e");
 * console.log(recipient);
 * // => "9Yb3kJXMMHUN9ry1w7UTFETe1zuM2pGzM66d4aBjtMCh"
 * ```
 */
export const parseOFTRecipient = (addressBytes32: string): string => {
  const bytes = Buffer.from(addressBytes32, "hex");
  const solanaAddress = bs58.encode(bytes);
  return solanaAddress;
};
