import { Chain, createConfig, Env } from '@lombard.finance/sdk';
import { useBtcDeposit, useLombardSDK } from '@lombard.finance/sdk-react';
import { useCallback } from 'react';

import { getEnvironment } from '../../lib/config';
import type { StakingFormData } from '../../lib/types';

/**
 * Hook for managing Bitcoin staking to EVM chains
 *
 * Handles SDK initialization for EVM, stake action lifecycle, and event monitoring
 *
 * @param partnerId - Partner ID to bypass reCAPTCHA (required without captcha integration)
 * @param env - Environment (prod, testnet, stage)
 */
export function useBtcStakingEvm(partnerId?: string, env?: Env) {
  const currentEnv = env ?? getEnvironment();

  const {
    sdk,
    isInitializing,
    error: sdkError,
  } = useLombardSDK(
    () =>
      createConfig({
        env: currentEnv,
        providers: {
          ...(window.ethereum && { evm: () => window.ethereum! }),
        },
        ...(partnerId && { partner: { partnerId } }),
      }),
    [partnerId, currentEnv],
  );

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
