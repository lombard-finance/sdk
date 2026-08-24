import {
  AssetId,
  type LombardSDK,
  NonEvmOperationStatus,
} from '@lombard.finance/sdk';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { NonEvmWithdrawParams, WithdrawStatus } from '../types';

export type NonEvmChainNamespace = 'solana' | 'starknet' | 'sui';

export interface UseNonEvmWithdrawReturn {
  withdraw: (params: NonEvmWithdrawParams) => Promise<void>;
  reset: () => void;
  txHash: string | null;
  status: WithdrawStatus;
  error: string | null;
  isLoading: boolean;
}

const NON_EVM_UNSTAKE_STATUS_MAP: Partial<Record<string, WithdrawStatus>> = {
  [NonEvmOperationStatus.IDLE]: { phase: 'idle', message: 'Ready' },
  [NonEvmOperationStatus.READY]: {
    phase: 'ready',
    message: 'Ready to execute',
  },
  [NonEvmOperationStatus.CONFIRMING]: {
    phase: 'confirming',
    message: 'Confirming transaction...',
  },
  [NonEvmOperationStatus.COMPLETED]: {
    phase: 'complete',
    message: 'Withdrawal complete!',
  },
};

/**
 * Hook for running a non-EVM withdraw action flow (burn LBTC on Solana/Starknet/Sui → receive BTC).
 *
 * Manages the lifecycle: prepare → execute.
 * Returns txHash on completion.
 *
 * @param sdk - LombardSDK instance from useLombardSDK, or null if not yet initialized
 * @param chainNamespace - The chain to withdraw from: 'solana' | 'starknet' | 'sui'
 */
export function useNonEvmWithdraw(
  sdk: LombardSDK | null,
  chainNamespace: NonEvmChainNamespace,
): UseNonEvmWithdrawReturn {
  const [txHash, setTxHash] = useState<string | null>(null);
  const [status, setStatus] = useState<WithdrawStatus>({
    phase: 'idle',
    message: 'Ready to withdraw',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const withdraw = useCallback(
    async (params: NonEvmWithdrawParams) => {
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

        const chain = sdk.chain[chainNamespace];
        const action = chain.withdraw({
          assetIn: AssetId.LBTC,
          assetOut: AssetId.BTC,
          sourceChain: params.sourceChain,
          destChain: params.destChain,
        });

        const unsubStatus = action.on('status-change', (...args: unknown[]) => {
          const newStatus = args[0] as NonEvmOperationStatus;
          setStatus(
            NON_EVM_UNSTAKE_STATUS_MAP[newStatus] ?? {
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

        setStatus({ phase: 'executing', message: 'Burning LBTC...' });
        const result = await action.execute();

        setTxHash(result.txHash);
        setStatus({
          phase: 'complete',
          message: 'Withdrawal complete! BTC will be released.',
        });
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
    [sdk, chainNamespace],
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
