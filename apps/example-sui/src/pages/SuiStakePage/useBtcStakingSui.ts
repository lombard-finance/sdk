import { Chain, createConfig, Env } from "@lombard.finance/sdk";
import { suiModule } from "@lombard.finance/sdk-sui";
import { useBtcStake, useLombardSDK } from "@lombard.finance/sdk-react";
import { useCallback } from "react";

import { getEnvironment } from "../../lib/config";
import type { StakingFormData } from "../../lib/types";

/**
 * Hook for managing Bitcoin staking to Sui
 *
 * Handles SDK initialization with Sui module, stake action lifecycle, and event monitoring
 *
 * @param suiWallet - Sui wallet object (from useSuiWallet)
 * @param suiWalletAccount - Sui wallet account (from useSuiWallet)
 * @param partnerId - Partner ID to bypass reCAPTCHA (required without captcha integration)
 * @param env - Environment (prod, testnet, stage)
 */
export function useBtcStakingSui(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  suiWallet?: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  suiWalletAccount?: any,
  partnerId?: string,
  env?: Env,
) {
  const currentEnv = env ?? getEnvironment();

  const {
    sdk,
    isInitializing,
    error: sdkError,
  } = useLombardSDK(() => {
    if (!suiWallet) return undefined;
    const suiProvider =
      suiWallet && suiWalletAccount
        ? {
            getWallet: () => suiWallet,
            getWalletAccount: () => suiWalletAccount,
          }
        : undefined;
    return createConfig({
      env: currentEnv,
      providers: { ...(suiProvider && { sui: () => suiProvider }) },
      modules: [suiModule()],
      ...(partnerId && { partner: { partnerId } }),
    });
  }, [suiWallet, suiWalletAccount, partnerId, currentEnv]);

  const {
    stake: stakeCore,
    reset,
    depositAddress,
    stakeAmount,
    status,
    progress,
    error: stakeError,
  } = useBtcStake(sdk);

  const sourceChain =
    currentEnv === Env.prod ? Chain.BITCOIN_MAINNET : Chain.BITCOIN_SIGNET;

  const stake = useCallback(
    (formData: StakingFormData) =>
      stakeCore({
        amount: formData.amount,
        destChain: formData.destChain,
        sourceChain,
        assetOut: formData.assetOut,
        recipient: formData.destAddress,
      }),
    [stakeCore, sourceChain],
  );

  return {
    sdk,
    stake,
    reset,
    isInitializing,
    error: sdkError ?? stakeError,
    depositAddress,
    stakeAmount,
    status,
    progress,
  };
}
