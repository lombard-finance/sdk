import {
  AssetId,
  type LombardSDK,
  NonEvmUnstakeStatus,
} from '@lombard.finance/sdk';
import { useCallback, useRef, useState } from 'react';

import type { NonEvmUnstakeParams, UnstakingStatus } from '../types';

export type NonEvmChainNamespace = 'solana' | 'starknet' | 'sui';

export interface UseNonEvmUnstakeReturn {
  unstake: (params: NonEvmUnstakeParams) => Promise<void>;
  reset: () => void;
  txHash: string | null;
  status: UnstakingStatus;
  error: string | null;
  isLoading: boolean;
}

const NON_EVM_UNSTAKE_STATUS_MAP: Partial<Record<string, UnstakingStatus>> = {
  [NonEvmUnstakeStatus.IDLE]: { phase: 'idle', message: 'Ready' },
  [NonEvmUnstakeStatus.READY]: { phase: 'ready', message: 'Ready to execute' },
  [NonEvmUnstakeStatus.CONFIRMING]: {
    phase: 'confirming',
    message: 'Confirming transaction...',
  },
  [NonEvmUnstakeStatus.COMPLETED]: {
    phase: 'complete',
    message: 'Unstake complete!',
  },
};

/**
 * Hook for running a non-EVM unstake action flow (burn LBTC on Solana/Starknet/Sui → receive BTC).
 *
 * Manages the lifecycle: prepare → execute.
 * Returns txHash on completion.
 *
 * @param sdk - LombardSDK instance from useLombardSDK, or null if not yet initialized
 * @param chainNamespace - The chain to unstake from: 'solana' | 'starknet' | 'sui'
 */
export function useNonEvmUnstake(
  sdk: LombardSDK | null,
  chainNamespace: NonEvmChainNamespace,
): UseNonEvmUnstakeReturn {
  const [txHash, setTxHash] = useState<string | null>(null);
  const [status, setStatus] = useState<UnstakingStatus>({
    phase: 'idle',
    message: 'Ready to unstake',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const unstake = useCallback(
    async (params: NonEvmUnstakeParams) => {
      if (!sdk) {
        throw new Error('SDK not initialized');
      }

      // Clean up any lingering listeners from a previous call
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;

      try {
        setError(null);
        setIsLoading(true);
        setStatus({ phase: 'preparing', message: 'Creating unstake action...' });

        const chain = sdk.chain[chainNamespace];
        const action = chain.unstake({
          assetIn: AssetId.LBTC,
          assetOut: AssetId.BTC,
          sourceChain: params.sourceChain,
          destChain: params.destChain,
        });

        const unsubStatus = action.on('status-change', (...args: unknown[]) => {
          const newStatus = args[0] as NonEvmUnstakeStatus;
          setStatus(
            NON_EVM_UNSTAKE_STATUS_MAP[newStatus] ?? {
              phase: 'idle',
              message: String(newStatus),
            },
          );
        });

        unsubscribeRef.current = unsubStatus;

        setStatus({ phase: 'preparing', message: 'Preparing unstake parameters...' });
        await action.prepare({ amount: params.amount, recipient: params.recipient });

        setStatus({ phase: 'executing', message: 'Burning LBTC...' });
        const result = await action.execute();

        setTxHash(result.txHash);
        setStatus({ phase: 'complete', message: 'Unstake complete! BTC will be released.' });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unstaking failed';
        setError(message);
        setStatus({ phase: 'error', message });
        throw err;
      } finally {
        // Unstake is complete (success or failure); unsubscribe now
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
    setStatus({ phase: 'idle', message: 'Ready to unstake' });
    setError(null);
    setIsLoading(false);
  }, []);

  return { unstake, reset, txHash, status, error, isLoading };
}
