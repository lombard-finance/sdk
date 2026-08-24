import {
  AssetId,
  BtcActionStatus,
  type BtcStakeAndDeployProgress,
  type LombardSDK,
} from '@lombard.finance/sdk';
import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  BtcStakeAndBakeParams,
  StakeAndBakeProgressInfo,
  StakeAndBakeStatus,
} from '../types';

export interface UseBtcStakeAndBakeReturn {
  stakeAndDeploy: (params: BtcStakeAndBakeParams) => Promise<void>;
  reset: () => void;
  depositAddress: string | null;
  stakeAmount: string | null;
  status: StakeAndBakeStatus;
  progress: StakeAndBakeProgressInfo;
  error: string | null;
  isLoading: boolean;
}

const STAKE_AND_BAKE_STATUS_MAP: Partial<Record<string, StakeAndBakeStatus>> = {
  [BtcActionStatus.IDLE]: { phase: 'idle', message: 'Initializing...' },
  [BtcActionStatus.NEEDS_DEPLOY_AUTHORIZATION]: {
    phase: 'authorizing',
    message: 'Authorize vault deposit...',
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
 * Hook for running a BTC stake-and-bake action flow (stakeAndDeploy).
 *
 * Manages the lifecycle: prepare → authorizeDeposit (if needed) → generateDepositAddress.
 * Protocol and sourceChain are passed at call time for flexibility.
 *
 * @param sdk - LombardSDK instance from useLombardSDK, or null if not yet initialized
 */
export function useBtcStakeAndBake(
  sdk: LombardSDK | null,
): UseBtcStakeAndBakeReturn {
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string | null>(null);
  const [status, setStatus] = useState<StakeAndBakeStatus>({
    phase: 'idle',
    message: 'Ready to stake and bake',
  });
  const [progress, setProgress] = useState<StakeAndBakeProgressInfo>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const stakeAndDeploy = useCallback(
    async (params: BtcStakeAndBakeParams) => {
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
          message: 'Creating stake-and-bake action...',
        });

        const action = sdk.chain.btc.deploy({
          assetOut: AssetId.LBTC,
          destChain: params.destChain,
          sourceChain: params.sourceChain,
          protocol: params.protocol,
        });

        const unsubStatus = action.on('status-change', (...args: unknown[]) => {
          const newStatus = args[0] as BtcActionStatus;
          setStatus(
            STAKE_AND_BAKE_STATUS_MAP[newStatus] ?? {
              phase: 'idle',
              message: String(newStatus),
            },
          );
        });

        const unsubProgress = action.on('progress', (...args: unknown[]) => {
          const data = args[0] as BtcStakeAndDeployProgress;

          setProgress({
            confirmations: data.confirmations,
            requiredConfirmations: data.requiredConfirmations,
            isDeposited: data.isDeposited,
            isClaimed: data.isClaimed,
          });

          if (data.confirmations !== undefined) {
            if (data.hasEnoughConfirmations && !data.isDeposited) {
              setStatus({
                phase: 'depositing',
                message: 'Minting LBTC and depositing to vault...',
              });
            } else if (!data.hasEnoughConfirmations) {
              setStatus({
                phase: 'confirming',
                message: 'Confirming transaction...',
              });
            }
          }

          if (data.isDeposited) {
            setStatus({
              phase: 'complete',
              message: 'Stake and bake complete!',
            });
          }
        });

        // Keep listeners alive — progress events fire asynchronously after deposit
        unsubscribeRef.current = () => {
          unsubStatus();
          unsubProgress();
        };

        setStatus({ phase: 'preparing', message: 'Preparing parameters...' });
        await action.prepare({
          amount: params.amount,
          recipient: params.recipient,
          ...(params.referralCode && { referralCode: params.referralCode }),
        });

        if (action.status === BtcActionStatus.NEEDS_DEPLOY_AUTHORIZATION) {
          setStatus({
            phase: 'authorizing',
            message: 'Authorizing vault deposit...',
          });
          // Forwarded rather than defaulted here: omitting it leaves the
          // default to the SDK, so the hook does not carry a second copy.
          await action.authorizeDeposit(
            params.expiry === undefined ? undefined : { expiry: params.expiry },
          );
        }

        if (
          action.status === BtcActionStatus.ADDRESS_READY &&
          action.depositAddress
        ) {
          setDepositAddress(action.depositAddress);
          setStakeAmount(params.amount);
          setStatus({
            phase: 'waiting-deposit',
            message: 'Send BTC to the address below',
          });
        } else if (action.status === BtcActionStatus.READY) {
          setStatus({
            phase: 'waiting-deposit',
            message: 'Generating deposit address...',
          });
          const address = await action.generateDepositAddress();

          setDepositAddress(address);
          setStakeAmount(params.amount);
          setStatus({
            phase: 'waiting-deposit',
            message: 'Send BTC to the address below',
          });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Stake and bake failed';
        setError(message);
        setStatus({
          phase: 'error',
          message: 'Failed to create stake and bake',
        });
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
    setStatus({ phase: 'idle', message: 'Ready to stake and bake' });
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

  return {
    stakeAndDeploy,
    reset,
    depositAddress,
    stakeAmount,
    status,
    progress,
    error,
    isLoading,
  };
}
