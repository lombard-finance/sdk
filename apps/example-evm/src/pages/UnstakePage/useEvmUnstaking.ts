import {
  AssetId,
  Chain,
  createLombardSDK,
  Env,
  EvmOperationStatus,
  type LombardSDK,
} from '@lombard.finance/sdk';
import { useCallback, useEffect, useState } from 'react';

import { getEnvironment } from '../../lib/config';

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
 * Unstaking status for UI
 */
export interface UnstakingStatus {
  phase:
    | 'idle'
    | 'preparing'
    | 'authorizing'
    | 'executing'
    | 'complete'
    | 'error';
  message: string;
}

/**
 * Hook for managing EVM unstaking flow
 *
 * Handles SDK initialization, unstake action lifecycle (burn LBTC -> receive BTC/BTCb)
 *
 * Note: Partner ID is not required for unstaking as it's a pure on-chain operation.
 */
export function useEvmUnstaking(evmAddress?: string | null, env?: Env) {
  const [sdk, setSdk] = useState<LombardSDK | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [status, setStatus] = useState<UnstakingStatus>({
    phase: 'idle',
    message: 'Ready to unstake',
  });

  // Initialize SDK
  useEffect(() => {
    let mounted = true;

    async function initSdk() {
      try {
        setIsInitializing(true);

        const lombard = await createLombardSDK({
          env: env ?? getEnvironment(),
          providers: {
            ...(window.ethereum && { evm: () => window.ethereum! }),
          },
        });

        if (mounted) {
          setSdk(lombard);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to initialize SDK:', err);
        if (mounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to initialize SDK',
          );
        }
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    }

    initSdk();

    return () => {
      mounted = false;
    };
  }, [evmAddress, env]);

  /**
   * Start unstaking process
   */
  const unstake = useCallback(
    async (formData: UnstakingFormData) => {
      if (!sdk) {
        throw new Error('SDK not initialized');
      }

      try {
        setError(null);

        // Step 1: Create unstake action
        setStatus({
          phase: 'preparing',
          message: 'Creating unstake action...',
        });

        const action = sdk.chain.evm.unstake({
          assetIn: AssetId.LBTC,
          assetOut: formData.assetOut,
          sourceChain: formData.sourceChain,
          destChain: formData.destChain,
        });

        // Listen to status changes
        action.on('status-change', (...args: unknown[]) => {
          const newStatus = args[0] as EvmOperationStatus;
          console.log('Status changed:', newStatus);

          const statusMap: Record<EvmOperationStatus, UnstakingStatus> = {
            [EvmOperationStatus.IDLE]: { phase: 'idle', message: 'Ready' },
            [EvmOperationStatus.NEEDS_FEE_AUTHORIZATION]: {
              phase: 'authorizing',
              message: 'Authorization required...',
            },
            [EvmOperationStatus.NEEDS_APPROVAL]: {
              phase: 'authorizing',
              message: 'Token approval required...',
            },
            [EvmOperationStatus.READY]: {
              phase: 'preparing',
              message: 'Ready to execute',
            },
            [EvmOperationStatus.CONFIRMING]: {
              phase: 'executing',
              message: 'Burning LBTC...',
            },
            [EvmOperationStatus.COMPLETED]: {
              phase: 'complete',
              message: 'Unstake complete!',
            },
          };

          const mappedStatus = statusMap[newStatus];
          if (mappedStatus) {
            setStatus(mappedStatus);
          }
        });

        // Step 2: Prepare with amount and recipient
        setStatus({
          phase: 'preparing',
          message: 'Preparing unstake parameters...',
        });
        await action.prepare({
          amount: formData.amount,
          recipient: formData.recipient,
        });

        // Step 3: Check if fee authorization is needed
        const currentStatus = action.status as EvmOperationStatus;

        if (currentStatus === EvmOperationStatus.NEEDS_FEE_AUTHORIZATION) {
          setStatus({
            phase: 'authorizing',
            message: 'Authorizing network fee...',
          });
          await action.authorizeFee();
        }

        // Step 4: Execute the unstake transaction
        setStatus({
          phase: 'executing',
          message: 'Executing unstake transaction...',
        });
        const result = await action.execute();

        if (result.txHash) {
          setTxHash(result.txHash);
          setStatus({
            phase: 'complete',
            message: 'Unstake completed successfully!',
          });
        }
      } catch (err) {
        console.error('Unstaking failed:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Unstaking failed';
        setError(errorMessage);
        setStatus({ phase: 'error', message: errorMessage });
        throw err;
      }
    },
    [sdk],
  );

  /**
   * Reset state for new unstake
   */
  const reset = useCallback(() => {
    setTxHash(null);
    setStatus({ phase: 'idle', message: 'Ready to unstake' });
    setError(null);
  }, []);

  return {
    sdk,
    unstake,
    reset,
    isInitializing,
    error,
    txHash,
    status,
  };
}
