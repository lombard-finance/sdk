import { decodeFunctionData, encodeAbiParameters, keccak256 } from "viem";

const GMP_V1_SELECTOR = "0xe288fb4a";
const MINT_SELECTOR = "0x155b6b13";

// ABI for the outer payload (matches your Solidity encodePayload/MessageV1)
const gmpPayloadAbi = {
  type: "function",
  name: "MessageV1",
  inputs: [
    { name: "msgPath", type: "bytes32" },
    { name: "msgNonce", type: "uint256" },
    { name: "msgSender", type: "bytes32" },
    { name: "msgRecipient", type: "bytes32" },
    { name: "msgDestinationCaller", type: "bytes32" },
    { name: "msgBody", type: "bytes" },
  ],
} as const;

// ABI for the inner body (mint)
const mintAbi = {
  type: "function",
  name: "mint",
  inputs: [
    { name: "toToken", type: "bytes32" },
    { name: "recipient", type: "bytes32" },
    { name: "amount", type: "uint256" },
  ],
} as const;

export interface DecodedMintBody {
  selector: string;
  toToken: string;
  recipient: string;
  amount: bigint;
}

export interface DecodedGmpPayload {
  selector: string; // outer selector (GMP_V1_SELECTOR)
  msgPath: string;
  msgNonce: bigint;
  msgSender: string;
  msgRecipient: string;
  msgDestinationCaller: string;
  rawBody: string; // full hex of msgBody
  mint: DecodedMintBody; // decoded body
}

/**
 * Example usage (for testing/debugging):
 *
 * async function testDecoding() {
 *   const res = decodeGmpMintPayload(
 *     '0xe288fb4a022d9999f6a62cd3401ba6e03ae710a1b3fcd8a77325b435371108676e600a5f...',
 *   );
 *   console.log(res);
 *   const mintID = calcMintIDFromDecoded(res, 747474); // Katana chainId
 *   console.log(mintID);
 * }
 */

/**
 * Decode ABI-encoded GMP Payload hex where msgBody is an ABI-encoded `mint` call.
 */
export function decodeGmpMintPayload(hexData: string): DecodedGmpPayload {
  if (!hexData.startsWith("0x")) {
    throw new Error("Payload must be 0x-prefixed hex");
  }

  // 1) Check outer selector
  const selector = hexData.slice(0, 10); // 4 bytes = 8 hex chars + '0x'
  if (selector.toLowerCase() !== GMP_V1_SELECTOR.toLowerCase()) {
    throw new Error(
      `Invalid GMP selector: expected ${GMP_V1_SELECTOR}, got ${selector}`,
    );
  }

  // 2) Decode outer payload using viem
  const decoded = decodeFunctionData({
    abi: [gmpPayloadAbi],
    data: hexData as `0x${string}`,
  });

  if (!decoded.args) {
    throw new Error("Failed to decode GMP payload: args is undefined");
  }

  const msgPath = decoded.args[0] as string;
  const msgNonce = decoded.args[1] as bigint;
  const msgSender = decoded.args[2] as string;
  const msgRecipient = decoded.args[3] as string;
  const msgDestinationCaller = decoded.args[4] as string;
  const msgBody = decoded.args[5] as string; // bytes => 0x…

  if (typeof msgBody !== "string" || !msgBody.startsWith("0x")) {
    throw new Error("msgBody is not valid hex");
  }

  // 3) Check inner selector (mint)
  const bodySelector = msgBody.slice(0, 10);
  if (bodySelector.toLowerCase() !== MINT_SELECTOR.toLowerCase()) {
    throw new Error(
      `Invalid mint selector in body: expected ${MINT_SELECTOR}, got ${bodySelector}`,
    );
  }

  // 4) Decode mint body using viem
  const mintDecoded = decodeFunctionData({
    abi: [mintAbi],
    data: msgBody as `0x${string}`,
  });

  if (!mintDecoded.args) {
    throw new Error("Failed to decode mint body: args is undefined");
  }

  const toToken = mintDecoded.args[0] as string;
  const recipient = mintDecoded.args[1] as string;
  const amount = mintDecoded.args[2] as bigint;

  return {
    selector,
    msgPath,
    msgNonce,
    msgSender,
    msgRecipient,
    msgDestinationCaller,
    rawBody: msgBody,
    mint: {
      selector: bodySelector,
      toToken,
      recipient,
      amount,
    },
  };
}

/**
 * Calculate mintID off-chain, equivalent to Solidity _mintID(Message).
 *
 * @param decoded - result of decodeGmpMintPayload(...)
 * @param chainId - destination EVM chain id (same as block.chainid on that chain)
 */
export function calcMintIDFromDecoded(
  decoded: DecodedGmpPayload,
  chainId: bigint | number | string,
): string {
  const { msgNonce, mint } = decoded;

  // Solidity: abi.encode(uint256 nonce, uint256 chainId, address recipient, address toToken, uint256 amount)
  const encoded = encodeAbiParameters(
    [
      { name: "nonce", type: "uint256" },
      { name: "chainId", type: "uint256" },
      { name: "recipient", type: "bytes32" },
      { name: "toToken", type: "bytes32" },
      { name: "amount", type: "uint256" },
    ],
    [
      BigInt(msgNonce), // self.nonce
      BigInt(chainId), // block.chainid
      mint.recipient as `0x${string}`, // self.recipient
      mint.toToken as `0x${string}`, // self.toToken
      BigInt(mint.amount), // self.amount
    ],
  );

  // bytes32 mintID = keccak256(encoded)
  return keccak256(encoded);
}
