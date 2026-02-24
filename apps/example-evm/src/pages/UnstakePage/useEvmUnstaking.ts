import { AssetId, Chain, createConfig, Env } from '@lombard.finance/sdk';
import { useEvmUnstake, useLombardSDK } from '@lombard.finance/sdk-react';
import { useCallback } from 'react';

import { getEnvironment } from '../../lib/config';

export type { UnstakingStatus } from '@lombard.finance/sdk-react';

/**
 * Form data for EVM unstaking
 */
export interface UnstakingFormData {
  amount: string;
  sourceChain: Chain;
  destChain: Chain;
  recipient: string;
  assetOut: AssetId;
}

/**
 * Hook for managing EVM unstaking flow
 *
 * Handles SDK initialization, unstake action lifecycle (burn LBTC -> receive BTC/BTCb)
 *
 * Note: Partner ID is not required for unstaking as it's a pure on-chain operation.
 */
export function useEvmUnstaking(evmAddress?: string | null, env?: Env) {
  const currentEnv = env ?? getEnvironment();

  const { sdk, isInitializing, error: sdkError } = useLombardSDK(
    () =>
      createConfig({
        env: currentEnv,
        providers: {
          ...(window.ethereum && { evm: () => window.ethereum! }),
        },
      }),
    [evmAddress, currentEnv],
  );

  const {
    unstake: unstakeCore,
    reset,
    txHash,
    status,
    error: unstakeError,
  } = useEvmUnstake(sdk);

  const unstake = useCallback(
    (formData: UnstakingFormData) =>
      unstakeCore({
        amount: formData.amount,
        sourceChain: formData.sourceChain,
        destChain: formData.destChain,
        recipient: formData.recipient,
        assetOut: formData.assetOut,
      }),
    [unstakeCore],
  );

  return {
    sdk,
    unstake,
    reset,
    isInitializing,
    error: sdkError ?? unstakeError,
    txHash,
    status,
  };
}
