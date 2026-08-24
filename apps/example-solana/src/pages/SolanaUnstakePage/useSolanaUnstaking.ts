import { AssetId, Chain, createConfig, Env } from '@lombard.finance/sdk';
import { useLombardSDK,useNonEvmWithdraw } from '@lombard.finance/sdk-react';
import { solanaModule } from '@lombard.finance/sdk-solana';
import { useCallback } from 'react';

import { getEnvironment } from '../../lib/config';

/**
 * Form data for Solana unstaking
 */
export interface SolanaUnstakingFormData {
  amount: string;
  sourceChain: Chain;
  destChain: Chain;
  recipient: string;
  assetOut: AssetId;
}

/**
 * Unstaking status for UI
 */
export type { WithdrawStatus as SolanaUnstakingStatus } from '@lombard.finance/sdk-react';

/**
 * Hook for managing Solana unstaking flow (LBTC → BTC)
 *
 * Handles SDK initialization, unstake action lifecycle (burn LBTC on Solana -> receive BTC on Bitcoin)
 *
 * Note: Partner ID is not required for unstaking as it's a pure on-chain operation.
 */
export function useSolanaUnstaking(solanaAddress?: string | null, env?: Env) {
  const currentEnv = env ?? getEnvironment();

  const {
    sdk,
    isInitializing,
    error: sdkError,
  } = useLombardSDK(() => {
    if (!solanaAddress) return undefined;
    return createConfig({
      env: currentEnv,
      providers: {
        ...(window.solana && { solana: () => window.solana! }),
      },
      modules: [solanaModule()],
    });
  }, [solanaAddress, currentEnv]);

  const {
    withdraw: unstakeCore,
    reset,
    txHash,
    status,
    error: unstakeError,
  } = useNonEvmWithdraw(sdk, 'solana');

  const unstake = useCallback(
    (formData: SolanaUnstakingFormData) =>
      unstakeCore({
        amount: formData.amount,
        sourceChain: formData.sourceChain,
        destChain: formData.destChain,
        recipient: formData.recipient,
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
