import {
  BtcActionStatus,
  type BtcStakeProgress,
  type LombardSDK,
} from '@lombard.finance/sdk';
import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  BtcStakeParams,
  StakingProgressInfo,
  StakingStatus,
} from '../types';

export interface UseBtcStakeReturn {
  stake: (params: BtcStakeParams) => Promise<void>;
  reset: () => void;
  depositAddress: string | null;
  stakeAmount: string | null;
  status: StakingStatus;
  progress: StakingProgressInfo;
  error: string | null;
  isLoading: boolean;
}

const BTC_STAKE_STATUS_MAP: Partial<Record<string, StakingStatus>> = {
  [BtcActionStatus.IDLE]: { phase: 'idle', message: 'Initializing...' },
  [BtcActionStatus.NEEDS_FEE_AUTHORIZATION]: {
    phase: 'preparing',
    message: 'Authorize fee...',
  },
  [BtcActionStatus.NEEDS_ADDRESS_CONFIRMATION]: {
    phase: 'preparing',
    message: 'Confirm address...',
  },
  [BtcActionStatus.NEEDS_DEPLOY_AUTHORIZATION]: {
    phase: 'preparing',
    message: 'Authorize deployment...',
  },
  [BtcActionStatus.READY]: {
    phase: 'preparing',
    message: 'Ready to generate address',
  },
  [BtcActionStatus.ADDRESS_READY]: {
    phase: 'waiting-deposit',
    message: 'Waiting for BTC deposit',
  },
};

/**
 * Hook for running a BTC staking action flow.
 *
 * Manages the lifecycle: prepare → authorize (if needed) → generateDepositAddress.
 * Subscribes to status-change and progress events from the SDK action.
 *
 * @param sdk - LombardSDK instance from useLombardSDK, or null if not yet initialized
 */
export function useBtcStake(sdk: LombardSDK | null): UseBtcStakeReturn {
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string | null>(null);
  const [status, setStatus] = useState<StakingStatus>({
    phase: 'idle',
    message: 'Ready to stake',
  });
  const [progress, setProgress] = useState<StakingProgressInfo>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const stake = useCallback(
    async (params: BtcStakeParams) => {
      if (!sdk) {
        throw new Error('SDK not initialized');
      }

      // Clean up any lingering listeners from a previous call
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;

      try {
        setError(null);
        setIsLoading(true);
        setStatus({ phase: 'preparing', message: 'Creating stake action...' });

        const action = sdk.chain.btc.stake({
          assetOut: params.assetOut,
          destChain: params.destChain,
          sourceChain: params.sourceChain,
        });

        const unsubStatus = action.on('status-change', (...args: unknown[]) => {
          const newStatus = args[0] as BtcActionStatus;
          setStatus(
            BTC_STAKE_STATUS_MAP[newStatus] ?? {
              phase: 'idle',
              message: String(newStatus),
            },
          );
        });

        const unsubProgress = action.on('progress', (...args: unknown[]) => {
          const data = args[0] as BtcStakeProgress;

          setProgress({
            confirmations: data.confirmations,
            requiredConfirmations: data.requiredConfirmations,
          });

          if (data.confirmations !== undefined) {
            if (data.hasEnoughConfirmations) {
              setStatus({ phase: 'minting', message: 'Minting LBTC...' });
            } else {
              setStatus({ phase: 'confirming', message: 'Confirming transaction...' });
            }
          }

          if (data.isClaimed) {
            setStatus({ phase: 'complete', message: 'Staking complete!' });
          }
        });

        // Keep listeners alive — progress events fire asynchronously after deposit
        unsubscribeRef.current = () => {
          unsubStatus();
          unsubProgress();
        };

        setStatus({ phase: 'preparing', message: 'Preparing stake parameters...' });
        await action.prepare({ amount: params.amount, recipient: params.recipient });

        const currentStatus = action.status as BtcActionStatus;

        if (
          currentStatus === BtcActionStatus.NEEDS_FEE_AUTHORIZATION ||
          currentStatus === BtcActionStatus.NEEDS_ADDRESS_CONFIRMATION
        ) {
          setStatus({ phase: 'preparing', message: 'Authorizing stake...' });
          await action.authorize();
        }

        if (action.status === BtcActionStatus.ADDRESS_READY && action.depositAddress) {
          setDepositAddress(action.depositAddress);
          setStakeAmount(params.amount);
          setStatus({ phase: 'waiting-deposit', message: 'Send BTC to the address below' });
        } else if (action.status === BtcActionStatus.READY) {
          setStatus({ phase: 'waiting-deposit', message: 'Generating deposit address...' });
          await action.generateDepositAddress();

          if (action.depositAddress) {
            setDepositAddress(action.depositAddress);
            setStakeAmount(params.amount);
            setStatus({ phase: 'waiting-deposit', message: 'Send BTC to the address below' });
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Staking failed';
        setError(message);
        setStatus({ phase: 'error', message: 'Failed to create stake' });
        throw err;
      } finally {
        // Do NOT unsubscribe here — progress events must continue firing after deposit
        setIsLoading(false);
      }
    },
    [sdk],
  );

  const reset = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    setDepositAddress(null);
    setStakeAmount(null);
    setStatus({ phase: 'idle', message: 'Ready to stake' });
    setProgress({});
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

  return { stake, reset, depositAddress, stakeAmount, status, progress, error, isLoading };
}
