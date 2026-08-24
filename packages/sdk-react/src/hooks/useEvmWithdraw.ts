import {
  AssetId,
  EvmOperationStatus,
  type LombardSDK,
} from '@lombard.finance/sdk';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { EvmWithdrawParams, WithdrawStatus } from '../types';

export interface UseEvmWithdrawReturn {
  withdraw: (params: EvmWithdrawParams) => Promise<void>;
  reset: () => void;
  txHash: string | null;
  status: WithdrawStatus;
  error: string | null;
  isLoading: boolean;
}

const EVM_UNSTAKE_STATUS_MAP: Partial<Record<string, WithdrawStatus>> = {
  [EvmOperationStatus.IDLE]: { phase: 'idle', message: 'Ready' },
  [EvmOperationStatus.NEEDS_FEE_AUTHORIZATION]: {
    phase: 'authorizing',
    message: 'Authorization required...',
  },
  [EvmOperationStatus.NEEDS_APPROVAL]: {
    phase: 'authorizing',
    message: 'Token approval required...',
  },
  [EvmOperationStatus.READY]: { phase: 'ready', message: 'Ready to execute' },
  [EvmOperationStatus.CONFIRMING]: {
    phase: 'executing',
    message: 'Burning LBTC...',
  },
  [EvmOperationStatus.COMPLETED]: {
    phase: 'complete',
    message: 'Withdrawal complete!',
  },
};

/**
 * Hook for running an EVM withdraw action flow (burn LBTC → receive BTC/BTCb).
 *
 * Manages the lifecycle: prepare → authorizeFee (if needed) → execute.
 * Returns txHash on completion.
 *
 * @param sdk - LombardSDK instance from useLombardSDK, or null if not yet initialized
 */
export function useEvmWithdraw(sdk: LombardSDK | null): UseEvmWithdrawReturn {
  const [txHash, setTxHash] = useState<string | null>(null);
  const [status, setStatus] = useState<WithdrawStatus>({
    phase: 'idle',
    message: 'Ready to withdraw',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const withdraw = useCallback(
    async (params: EvmWithdrawParams) => {
      if (!sdk) {
        throw new Error('SDK not initialized');
      }

      // Clean up any lingering listeners from a previous call
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;

      try {
        setError(null);
        setIsLoading(true);
        setStatus({
          phase: 'preparing',
          message: 'Creating withdraw action...',
        });

        const action = sdk.chain.evm.withdraw({
          assetIn: AssetId.LBTC,
          assetOut: params.assetOut,
          sourceChain: params.sourceChain,
          destChain: params.destChain,
        });

        const unsubStatus = action.on('status-change', (...args: unknown[]) => {
          const newStatus = args[0] as EvmOperationStatus;
          setStatus(
            EVM_UNSTAKE_STATUS_MAP[newStatus] ?? {
              phase: 'idle',
              message: String(newStatus),
            },
          );
        });

        unsubscribeRef.current = unsubStatus;

        setStatus({
          phase: 'preparing',
          message: 'Preparing withdraw parameters...',
        });
        await action.prepare({
          amount: params.amount,
          recipient: params.recipient,
        });

        if (action.status === EvmOperationStatus.NEEDS_FEE_AUTHORIZATION) {
          setStatus({
            phase: 'authorizing',
            message: 'Authorizing network fee...',
          });
          await action.authorizeFee();
        }

        setStatus({
          phase: 'executing',
          message: 'Executing withdraw transaction...',
        });
        const result = await action.execute();

        if (result.txHash) {
          setTxHash(result.txHash);
          setStatus({
            phase: 'complete',
            message: 'Withdrawal completed successfully!',
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unstaking failed';
        setError(message);
        setStatus({ phase: 'error', message });
        throw err;
      } finally {
        // The withdrawal is settled either way; unsubscribe now
        unsubscribeRef.current?.();
        unsubscribeRef.current = null;
        setIsLoading(false);
      }
    },
    [sdk],
  );

  const reset = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    setTxHash(null);
    setStatus({ phase: 'idle', message: 'Ready to withdraw' });
    setError(null);
    setIsLoading(false);
  }, []);

  // Clean up listeners on unmount
  useEffect(() => {
    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, []);

  return { withdraw, reset, txHash, status, error, isLoading };
}
