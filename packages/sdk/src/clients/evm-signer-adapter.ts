import {
  Address,
  createWalletClient,
  Hex,
  http,
  isHex,
  LocalAccount,
  TransactionSerializable,
  WalletClient,
} from "viem";

import { CHAIN_ID_TO_VIEM_CHAIN_MAP, ChainId } from "../common/chains";

/**
 * EVM transaction request structure compatible with unified bridge signers.
 * This matches the shape expected by bridge-unified's EvmSigner interface.
 */
export interface EvmTransactionRequest {
  /** Sender address */
  from: Address;
  /** Recipient address */
  to?: Address;
  /** Transaction data (calldata) */
  data?: Hex;
  /** Value to send in wei */
  value?: bigint;
  /** Gas limit */
  gas?: bigint;
  /** Maximum fee per gas (EIP-1559) */
  maxFeePerGas?: bigint;
  /** Maximum priority fee per gas (EIP-1559) */
  maxPriorityFeePerGas?: bigint;
  /** Chain ID in hex format (e.g., "0x1" for Ethereum mainnet) */
  chainId?: string;
  /** Transaction nonce */
  nonce?: number;
}

/**
 * Callback function to dispatch a signed transaction.
 * This is called by the signer after signing to broadcast the transaction.
 *
 * @param serializedTx - The signed, serialized transaction (0x-prefixed hex string)
 * @returns Promise resolving to the transaction hash
 */
export type DispatchCallback = (serializedTx: Hex) => Promise<Hex>;

/**
 * Signer interface compatible with unified bridge's EvmSigner.
 * Handles transaction signing and optionally broadcasting.
 *
 * @remarks
 * The `sign` method receives a transaction request and a dispatch callback.
 * The signer should:
 * 1. Sign the transaction
 * 2. Call the dispatch callback with the signed transaction
 * 3. Return the transaction hash
 */
export interface SignerAdapter {
  /**
   * Signs a transaction and dispatches it via the provided callback.
   *
   * @param tx - The transaction request to sign
   * @param dispatch - Callback to broadcast the signed transaction
   * @returns Promise resolving to the transaction hash
   *
   * @example
   * ```ts
   * const txHash = await signer.sign(
   *   { from, to, data, value },
   *   (signedTx) => publicClient.sendRawTransaction({ serializedTransaction: signedTx })
   * );
   * ```
   */
  sign: (tx: EvmTransactionRequest, dispatch: DispatchCallback) => Promise<Hex>;
}

/**
 * Error thrown when transaction validation or signing fails.
 */
export class SignerError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "SignerError";
  }
}

/**
 * Validates an EVM transaction request.
 * Throws SignerError if validation fails.
 *
 * @param tx - Transaction request to validate
 * @throws {SignerError} If required fields are missing or invalid
 */
export function validateTransactionRequest(
  tx: EvmTransactionRequest,
  operation = "transaction",
): void {
  if (!tx.from) {
    throw new SignerError(
      "MISSING_FROM_ADDRESS",
      `Missing 'from' address for ${operation}`,
      { transaction: tx, operation },
    );
  }

  if (!tx.to) {
    throw new SignerError(
      "MISSING_TO_ADDRESS",
      `Missing 'to' address for ${operation}`,
      { transaction: tx, operation },
    );
  }

  if (tx.data !== undefined && !isHex(tx.data)) {
    throw new SignerError(
      "INVALID_DATA",
      `Transaction data must be valid hex string for ${operation}`,
      { transaction: tx, operation, data: tx.data },
    );
  }

  if (tx.chainId && !/^0x[0-9a-fA-F]+$/.test(tx.chainId)) {
    throw new SignerError(
      "INVALID_CHAIN_ID",
      `Chain ID must be a hex string (e.g., "0x1") for ${operation}`,
      { transaction: tx, operation, chainId: tx.chainId },
    );
  }
}

/**
 * Creates a Viem LocalAccount from a SignerAdapter.
 * This allows the unified bridge's EvmSigner to be used as a standard Viem account.
 *
 * @param signer - The SignerAdapter to wrap
 * @param address - The account address
 * @param chainId - The chain ID
 * @returns A Viem LocalAccount that delegates signing to the SignerAdapter
 *
 * @remarks
 * This adapter enables the SDK to use a unified-bridge EvmSigner with Viem's
 * standard wallet client, eliminating the need for separate code paths.
 *
 * The adapter:
 * - Validates transaction requests before signing
 * - Converts between Viem and EvmSigner transaction formats
 * - Provides proper error context for debugging
 *
 * @example
 * ```ts
 * const account = createAccountFromSigner(
 *   bridgeEvmSigner,
 *   '0x1234...',
 *   ChainId.ethereum
 * );
 *
 * const walletClient = createWalletClient({
 *   account,
 *   chain: mainnet,
 *   transport: http(),
 * });
 *
 * // Now walletClient.writeContract works with the EvmSigner!
 * ```
 */
export function createAccountFromSigner(
  signer: SignerAdapter,
  address: Address,
  chainId: ChainId,
): LocalAccount {
  const chain = CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId];

  if (!chain) {
    throw new SignerError(
      "UNSUPPORTED_CHAIN",
      `Chain ID ${chainId} is not supported`,
      { chainId, availableChains: Object.keys(CHAIN_ID_TO_VIEM_CHAIN_MAP) },
    );
  }

  /**
   * Custom account implementation that delegates to SignerAdapter
   */
  const customAccount: LocalAccount = {
    address,
    type: "local" as const,
    publicKey:
      "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex,
    source: "custom" as const,

    /**
     * Signs a transaction using the SignerAdapter.
     * This is called by Viem's wallet client when executing transactions.
     */
    async signTransaction(transaction: TransactionSerializable): Promise<Hex> {
      // Convert Viem transaction to EvmTransactionRequest format
      const evmTx: EvmTransactionRequest = {
        from: address,
        to: transaction.to ?? undefined,
        data: transaction.data,
        value: transaction.value,
        gas: transaction.gas,
        maxFeePerGas: transaction.maxFeePerGas,
        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
        chainId: transaction.chainId
          ? `0x${transaction.chainId.toString(16)}`
          : `0x${chain.id.toString(16)}`,
        nonce: transaction.nonce,
      };

      // Validate before signing
      validateTransactionRequest(evmTx, "signTransaction");

      // Sign and return the serialized signed transaction
      // The dispatch callback here just returns what was passed (identity function)
      // because we want the signed transaction, not to broadcast it yet
      let signedTx: Hex | undefined;

      await signer.sign(evmTx, async (serialized) => {
        signedTx = serialized;
        // Return a dummy hash - the actual broadcasting happens via walletClient
        return serialized;
      });

      if (!signedTx) {
        throw new SignerError(
          "SIGNING_FAILED",
          "Signer did not return a signed transaction",
          { transaction: evmTx },
        );
      }

      // Ensure we return a Hex type (not null)
      return signedTx as Hex;
    },

    /**
     * Signs a message (EIP-191).
     * Not implemented as it's not needed for contract transactions.
     */
    async signMessage(): Promise<Hex> {
      throw new SignerError(
        "NOT_IMPLEMENTED",
        "Message signing is not supported by this adapter",
        { method: "signMessage" },
      );
    },

    /**
     * Signs typed data (EIP-712).
     * Not implemented as it's not needed for contract transactions.
     */
    async signTypedData(): Promise<Hex> {
      throw new SignerError(
        "NOT_IMPLEMENTED",
        "Typed data signing is not supported by this adapter",
        { method: "signTypedData" },
      );
    },
  };

  return customAccount;
}

/**
 * Creates a Viem wallet client from a SignerAdapter.
 * This is a convenience wrapper around createAccountFromSigner.
 *
 * @param signer - The SignerAdapter to use
 * @param address - The account address
 * @param chainId - The chain ID
 * @returns A Viem wallet client configured with the SignerAdapter
 *
 * @example
 * ```ts
 * const walletClient = createWalletClientFromSigner(
 *   bridgeEvmSigner,
 *   '0x1234...',
 *   ChainId.ethereum
 * );
 *
 * // Use like any Viem wallet client
 * await walletClient.writeContract({ ... });
 * ```
 */
export function createWalletClientFromSigner(
  signer: SignerAdapter,
  address: Address,
  chainId: ChainId,
): WalletClient {
  const chain = CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId];

  if (!chain) {
    throw new SignerError(
      "UNSUPPORTED_CHAIN",
      `Chain ID ${chainId} is not supported`,
      { chainId },
    );
  }

  const account = createAccountFromSigner(signer, address, chainId);

  return createWalletClient({
    account,
    chain,
    transport: http(), // Uses default RPC
  });
}
