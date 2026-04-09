import { Abi } from "viem";

import { makePublicClient } from "../../clients/public-client";
import { makeWalletClient } from "../../clients/wallet-client";
import { ChainId } from "../../common/chains";
import {
  ISignStakeAndBakeParams,
  ISignStakeAndBakeResult,
} from "./signStakeAndBake";
import { buildTypedData, serializeTypedData } from "./typed-data-builder";

/**
 * Handle approve flow (on-chain transaction).
 * Checks allowance and submits approve transaction if needed.
 */
export async function handleApproveFlow(params: {
  account: `0x${string}`;
  chainId: ChainId;
  provider: ISignStakeAndBakeParams["provider"];
  rpcUrl: ISignStakeAndBakeParams["rpcUrl"];
  tokenAddress: `0x${string}`;
  tokenAbi: Abi;
  spenderAddress: `0x${string}`;
  typedData: ReturnType<typeof buildTypedData>;
  requiredAmount: bigint;
}): Promise<ISignStakeAndBakeResult> {
  const {
    account,
    chainId,
    provider,
    rpcUrl,
    tokenAddress,
    tokenAbi,
    spenderAddress,
    typedData,
    requiredAmount,
  } = params;

  const publicClient = makePublicClient({ chainId, rpcUrl });
  const walletClient = makeWalletClient({ chainId, provider });

  // Check current allowance
  const currentAllowance = (await publicClient.readContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "allowance",
    args: [account, spenderAddress],
  })) as bigint;

  let approvalTxHash: string | undefined;

  // Submit approve transaction if allowance is insufficient
  if (currentAllowance < requiredAmount) {
    const hash = await walletClient.writeContract({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: "approve",
      args: [spenderAddress, requiredAmount],
      account,
      chain: null,
    });

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status !== "success") {
      throw new Error(
        `Approve transaction failed: ${hash}. Please try again or contact support.`,
      );
    }

    approvalTxHash = hash;
  }

  return {
    mode: "approve",
    signature: "",
    typedData: serializeTypedData(typedData),
    approvalTxHash,
  };
}
