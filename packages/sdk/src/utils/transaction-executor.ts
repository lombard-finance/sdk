import {
  Address,
  Hex,
  PublicClient,
  SimulateContractParameters,
  SimulateContractReturnType,
  WalletClient,
  encodeFunctionData,
} from 'viem';
import {
  EvmTransactionRequest,
  SignerError,
  validateTransactionRequest,
} from '../clients/evm-signer-adapter';
import { CHAIN_ID_TO_VIEM_CHAIN_MAP } from '../common/chains';
import {
  CommonSignerWriteParameters,
  CommonWriteParameters,
  isProviderFlow,
  isSignerFlow,
} from '../common/parameters';

/**
 * Minimal type-safe interface for contract simulation arguments.
 * Covers the essential properties we need while remaining flexible.
 */
export interface ContractCallArgs {
  /** Contract address to call */
  address: Address;
  /** Contract ABI */
  abi: readonly unknown[];
  /** Function name to call */
  functionName: string;
  /** Account making the call */
  account?: Address;
  /** Function arguments */
  args?: readonly unknown[];
  /** Value to send with the transaction */
  value?: bigint;
  /** Gas limit */
  gas?: bigint;
  /** Maximum fee per gas (EIP-1559) */
  maxFeePerGas?: bigint;
  /** Maximum priority fee per gas (EIP-1559) */
  maxPriorityFeePerGas?: bigint;
  /** Allow additional properties for chain-specific parameters */
  [key: string]: unknown;
}

/**
 * Parameters for executing a contract transaction.
 */
export interface ExecuteContractTxParams {
  /** The parameters provided by the caller (provider or signer flow) */
  params: CommonWriteParameters | CommonSignerWriteParameters;
  /** The public client for simulation and receipt waiting */
  publicClient: PublicClient;
  /** Optional wallet client (for provider flow) */
  walletClient?: WalletClient;
  /** The contract call to simulate */
  simulateArgs: ContractCallArgs;
  /** Operation name for error messages (e.g., "approval", "redeem") */
  operation: string;
}

/**
 * Result of a contract transaction execution.
 */
export interface ExecuteContractTxResult {
  /** The transaction hash */
  txHash: Hex;
  /** The simulation result (for debugging) */
  request: SimulateContractReturnType['request'];
}

/**
 * Executes a contract transaction using either provider or signer flow.
 *
 * This helper:
 * 1. Simulates the transaction with the public client
 * 2. Routes to appropriate execution path (provider or signer)
 * 3. Provides detailed error messages with context
 * 4. Validates all inputs before execution
 *
 * @param options - Execution parameters
 * @returns Transaction hash and request details
 * @throws {SignerError} If execution fails with detailed context
 *
 * @example
 * ```ts
 * // Provider flow
 * const result = await executeContractTransaction({
 *   params: { provider, account, chainId, env },
 *   publicClient,
 *   walletClient,
 *   simulateArgs: { address, abi, functionName, args },
 *   operation: 'approval',
 * });
 *
 * // Signer flow
 * const result = await executeContractTransaction({
 *   params: { signer, account, chainId, env },
 *   publicClient,
 *   simulateArgs: { address, abi, functionName, args },
 *   operation: 'redeem',
 * });
 * ```
 */
export async function executeContractTransaction({
  params,
  publicClient,
  walletClient,
  simulateArgs,
  operation,
}: ExecuteContractTxParams): Promise<ExecuteContractTxResult> {
  // Validate that we have either provider or signer
  if (!isProviderFlow(params) && !isSignerFlow(params)) {
    throw new SignerError(
      'INVALID_PARAMETERS',
      'Must provide either "provider" or "signer" in parameters',
      { params, operation },
    );
  }

  // Simulate the transaction
  let simulationResult: SimulateContractReturnType;
  try {
    // Cast to viem's expected type for simulation
    // This is safe because ContractCallArgs contains all required properties
    simulationResult = await publicClient.simulateContract(
      simulateArgs as SimulateContractParameters,
    );
  } catch (error) {
    throw new SignerError(
      'SIMULATION_FAILED',
      `Failed to simulate ${operation} transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
      {
        operation,
        simulateArgs,
        error: error instanceof Error ? error.message : String(error),
      },
    );
  }

  const { request } = simulationResult;

  // Validate simulation result
  if (!request.account) {
    throw new SignerError(
      'INVALID_SIMULATION',
      `Simulation succeeded but no account was set for ${operation}`,
      { operation, request },
    );
  }

  if (!request.address) {
    throw new SignerError(
      'INVALID_SIMULATION',
      `Simulation succeeded but no target address was set for ${operation}`,
      { operation, request },
    );
  }

  // Execute transaction based on flow type
  let txHash: Hex;

  if (isProviderFlow(params)) {
    // Provider flow: use wallet client
    if (!walletClient) {
      throw new SignerError(
        'MISSING_WALLET_CLIENT',
        'Provider flow requires a wallet client',
        { operation, params },
      );
    }

    try {
      txHash = await walletClient.writeContract(request);
    } catch (error) {
      throw new SignerError(
        'PROVIDER_TRANSACTION_FAILED',
        `Failed to execute ${operation} via provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          operation,
          request,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  } else {
    // Signer flow: use signer adapter directly
    try {
      const chain = CHAIN_ID_TO_VIEM_CHAIN_MAP[params.chainId];

      // Encode the contract call data from the original simulation args
      // (using simulateArgs.abi instead of request.abi to avoid type narrowing issues)
      const callData = encodeFunctionData({
        abi: simulateArgs.abi,
        functionName: simulateArgs.functionName,
        args: simulateArgs.args,
      });

      // Convert viem request to EvmTransactionRequest format
      const evmTx: EvmTransactionRequest = {
        from: params.account,
        to: request.address,
        data: callData,
        value: request.value,
        gas: request.gas,
        maxFeePerGas: request.maxFeePerGas,
        maxPriorityFeePerGas: request.maxPriorityFeePerGas,
        chainId: `0x${chain.id.toString(16)}`,
      };

      // Validate transaction before signing
      validateTransactionRequest(evmTx, operation);

      // Sign and broadcast using the signer adapter
      txHash = await params.signer.sign(evmTx, async signedTx => {
        // Dispatch callback: broadcast the signed transaction
        return await publicClient.sendRawTransaction({
          serializedTransaction: signedTx,
        });
      });
    } catch (error) {
      throw new SignerError(
        'SIGNER_TRANSACTION_FAILED',
        `Failed to execute ${operation} via signer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          operation,
          request,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  return { txHash, request };
}

/**
 * Waits for a transaction receipt and provides detailed error information on failure.
 *
 * @param publicClient - The public client to use
 * @param txHash - The transaction hash to wait for
 * @param operation - Operation name for error messages
 * @throws {SignerError} If waiting for receipt fails
 */
export async function waitForTransactionReceipt(
  publicClient: PublicClient,
  txHash: Hex,
  operation: string,
) {
  try {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    if (receipt.status === 'reverted') {
      throw new SignerError(
        'TRANSACTION_REVERTED',
        `${operation} transaction reverted`,
        {
          operation,
          txHash,
          receipt: {
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed,
          },
        },
      );
    }

    return receipt;
  } catch (error) {
    if (error instanceof SignerError) {
      throw error;
    }

    throw new SignerError(
      'RECEIPT_WAIT_FAILED',
      `Failed to wait for ${operation} transaction receipt: ${error instanceof Error ? error.message : 'Unknown error'}`,
      {
        operation,
        txHash,
        error: error instanceof Error ? error.message : String(error),
      },
    );
  }
}
