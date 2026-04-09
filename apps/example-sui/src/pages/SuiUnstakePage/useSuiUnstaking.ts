import { createConfig, Env } from "@lombard.finance/sdk";
import { suiModule } from "@lombard.finance/sdk-sui";
import { useNonEvmUnstake, useLombardSDK } from "@lombard.finance/sdk-react";
import { useCallback } from "react";

import { getEnvironment } from "../../lib/config";
import type { UnstakingFormData, UnstakingStatus } from "../../lib/types";

/**
 * Hook for managing Sui unstaking flow (LBTC → BTC)
 *
 * Handles SDK initialization with Sui module, unstake action lifecycle, and event monitoring
 *
 * @param suiAddress - Sui wallet address
 * @param env - Environment (prod, testnet, stage)
 * @param suiWallet - Sui wallet object (from useSuiWallet)
 * @param suiWalletAccount - Sui wallet account (from useSuiWallet)
 */
export function useSuiUnstaking(
  suiAddress?: string | null,
  env?: Env,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  suiWallet?: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  suiWalletAccount?: any,
) {
  const currentEnv = env ?? getEnvironment();

  const {
    sdk,
    isInitializing,
    error: sdkError,
  } = useLombardSDK(() => {
    if (!suiAddress) return undefined;
    const suiProvider =
      suiWallet && suiWalletAccount
        ? {
            getWallet: () => suiWallet,
            getWalletAccount: () => suiWalletAccount,
          }
        : undefined;
    return createConfig({
      env: currentEnv,
      ...(suiProvider && { providers: { sui: () => suiProvider } }),
      modules: [suiModule()],
    });
  }, [suiAddress, suiWallet, suiWalletAccount, currentEnv]);

  const {
    unstake: unstakeCore,
    reset,
    txHash,
    status: unstakeStatus,
    error: unstakeError,
  } = useNonEvmUnstake(sdk, "sui");

  const status = unstakeStatus as UnstakingStatus;

  const unstake = useCallback(
    (formData: UnstakingFormData) =>
      unstakeCore({
        amount: formData.amount,
        sourceChain: formData.sourceChain,
        destChain: formData.destChain,
        recipient: formData.recipient,
      }),
    [unstakeCore],
  );

  return {
    unstake,
    reset,
    isInitializing,
    error: sdkError ?? unstakeError,
    txHash,
    status,
  };
}
