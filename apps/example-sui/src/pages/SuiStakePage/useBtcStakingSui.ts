import {
  BtcActionStatus,
  type BtcStakeProgress,
  Chain,
  createConfig,
  createLombardSDK,
  Env,
  type LombardSDK,
} from '@lombard.finance/sdk';
import { suiModule } from '@lombard.finance/sdk-sui';
import { useCallback, useEffect, useState } from 'react';

import { getEnvironment } from '../../lib/config';
import type {
  StakingFormData,
  StakingProgressInfo,
  StakingStatus,
} from '../../lib/types';

/**
 * Hook for managing Bitcoin staking to Sui
 *
 * Handles SDK initialization with Sui module, stake action lifecycle, and event monitoring
 *
 * @param suiWallet - Sui wallet object (from useSuiWallet)
 * @param suiWalletAccount - Sui wallet account (from useSuiWallet)
 * @param partnerId - Partner ID for captcha bypass (optional)
 * @param env - Environment (prod, testnet, stage)
 */
export function useBtcStakingSui(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  suiWallet?: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  suiWalletAccount?: any,
  partnerId?: string,
  env?: Env,
) {
  const [sdk, setSdk] = useState<LombardSDK | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string | null>(null);
  const [status, setStatus] = useState<StakingStatus>({
    phase: 'idle',
    message: 'Ready to stake',
  });
  const [progress, setProgress] = useState<StakingProgressInfo>({});

  // Initialize SDK with Sui module
  useEffect(() => {
    let mounted = true;

    async function initSdk() {
      try {
        setIsInitializing(true);

        // Create Sui provider adapter
        const suiProvider =
          suiWallet && suiWalletAccount
            ? {
                getWallet: () => suiWallet,
                getWalletAccount: () => suiWalletAccount,
              }
            : undefined;

        // Config with Sui module
        const config = createConfig({
          env: env ?? getEnvironment(),
          providers: {
            ...(suiProvider && { sui: () => suiProvider }),
          },
          modules: [suiModule()],
          ...(partnerId && { partner: { partnerId } }),
        });

        const lombard = await createLombardSDK(config);

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

    if (suiWallet) {
      initSdk();
    }

    return () => {
      mounted = false;
    };
  }, [suiWallet, suiWalletAccount, partnerId, env]);

  /**
   * Start staking process with given parameters
   */
  const stake = useCallback(
    async (formData: StakingFormData) => {
      if (!sdk) {
        throw new Error('SDK not initialized');
      }

      try {
        setError(null);
        setStatus({ phase: 'preparing', message: 'Creating stake action...' });

        const currentEnv = env ?? getEnvironment();
        const action = sdk.chain.btc.stake({
          assetOut: formData.assetOut,
          destChain: formData.destChain,
          sourceChain:
            currentEnv === Env.prod
              ? Chain.BITCOIN_MAINNET
              : Chain.BITCOIN_SIGNET,
        });

        // Listen to status changes
        action.on('status-change', (...args: unknown[]) => {
          const newStatus = args[0] as BtcActionStatus;
          console.log('Status changed:', newStatus);

          const statusMapping: Record<string, StakingStatus> = {
            [BtcActionStatus.IDLE]: {
              phase: 'idle',
              message: 'Initializing...',
            },
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

          setStatus(
            statusMapping[newStatus] || {
              phase: 'idle',
              message: String(newStatus),
            },
          );
        });

        // Listen to progress events
        action.on('progress', (...args: unknown[]) => {
          const progressData = args[0] as BtcStakeProgress;
          console.log('Progress:', progressData);

          setProgress({
            confirmations: progressData.confirmations,
            requiredConfirmations: progressData.requiredConfirmations,
          });

          if (progressData.confirmations !== undefined) {
            const hasEnough = progressData.hasEnoughConfirmations ?? false;
            if (hasEnough) {
              setStatus({ phase: 'minting', message: 'Minting LBTC...' });
            } else {
              setStatus({
                phase: 'confirming',
                message: 'Confirming transaction...',
              });
            }
          }

          if (progressData.isClaimed) {
            setStatus({ phase: 'complete', message: 'Staking complete!' });
          }
        });

        // Prepare with amount and recipient
        setStatus({
          phase: 'preparing',
          message: 'Preparing stake parameters...',
        });
        await action.prepare({
          amount: formData.amount,
          recipient: formData.destAddress,
        });

        // Authorization (Sui wallet signature)
        const currentStatus = action.status as BtcActionStatus;

        if (
          currentStatus === BtcActionStatus.NEEDS_FEE_AUTHORIZATION ||
          currentStatus === BtcActionStatus.NEEDS_ADDRESS_CONFIRMATION
        ) {
          setStatus({ phase: 'preparing', message: 'Authorizing stake...' });
          await action.authorize();
        }

        // Generate deposit address
        if (
          action.status === BtcActionStatus.ADDRESS_READY &&
          action.depositAddress
        ) {
          setDepositAddress(action.depositAddress);
          setStakeAmount(formData.amount);
          setStatus({
            phase: 'waiting-deposit',
            message: 'Send BTC to the address below',
          });
        } else if (action.status === BtcActionStatus.READY) {
          setStatus({
            phase: 'waiting-deposit',
            message: 'Generating deposit address...',
          });
          await action.generateDepositAddress();

          if (action.depositAddress) {
            setDepositAddress(action.depositAddress);
            setStakeAmount(formData.amount);
            setStatus({
              phase: 'waiting-deposit',
              message: 'Send BTC to the address below',
            });
          }
        }
      } catch (err) {
        console.error('Stake failed:', err);
        setError(err instanceof Error ? err.message : 'Staking failed');
        setStatus({ phase: 'error', message: 'Failed to create stake' });
        throw err;
      }
    },
    [sdk, env],
  );

  /**
   * Reset staking state
   */
  const reset = useCallback(() => {
    setDepositAddress(null);
    setStakeAmount(null);
    setStatus({ phase: 'idle', message: 'Ready to stake' });
    setProgress({});
    setError(null);
  }, []);

  return {
    sdk,
    stake,
    reset,
    isInitializing,
    error,
    depositAddress,
    stakeAmount,
    status,
    progress,
  };
}
