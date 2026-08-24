import { Chain, createConfig, Env } from '@lombard.finance/sdk';
import { useBtcDeposit, useLombardSDK } from '@lombard.finance/sdk-react';
import { solanaModule } from '@lombard.finance/sdk-solana';
import { useCallback } from 'react';

import { getEnvironment } from '../../lib/config';
import type { StakingFormData } from '../../lib/types';

/**
 * Hook for managing Bitcoin staking to Solana
 *
 * Handles SDK initialization with Solana module, stake action lifecycle, and event monitoring
 *
 * @param partnerId - Partner ID to bypass reCAPTCHA (required without captcha integration)
 * @param env - Environment (prod, testnet, stage)
 */
export function useBtcStakingSolana(partnerId?: string, env?: Env) {
  const currentEnv = env ?? getEnvironment();

  const {
    sdk,
    isInitializing,
    error: sdkError,
  } = useLombardSDK(() => {
    if (!window.solana) return undefined;
    return createConfig({
      env: currentEnv,
      providers: { solana: () => window.solana! },
      modules: [solanaModule()],
      ...(partnerId && { partner: { partnerId } }),
    });
  }, [partnerId, currentEnv]);

  const {
    deposit: stakeCore,
    reset,
    depositAddress,
    depositAmount: stakeAmount,
    status,
    progress,
    error: stakeError,
  } = useBtcDeposit(sdk);

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
