import {
  AssetId,
  BtcActionStatus,
  type BtcStakeAndDeployProgress,
  Chain,
  createConfig,
  createLombardSDK,
  DeployProtocol,
  Env,
  type LombardSDK,
} from '@lombard.finance/sdk';
import { useCallback, useEffect, useState } from 'react';

import { getEnvironment } from '../../lib/config';

export interface StakeAndBakeStatus {
  phase:
    | 'idle'
    | 'preparing'
    | 'authorizing'
    | 'waiting-deposit'
    | 'confirming'
    | 'depositing'
    | 'complete'
    | 'error';
  message: string;
}

export interface StakeAndBakeProgress {
  confirmations?: number;
  requiredConfirmations?: number;
  isDeposited?: boolean;
  isClaimed?: boolean;
}

/**
 * Hook for managing Stake-and-Bake flow (BTC → LBTC → Vault)
 *
 * Combines staking and vault deployment in a single atomic operation
 *
 * @param protocol - DeFi protocol to deploy to (Veda or Silo)
 * @param partnerId - Partner ID for captcha bypass (optional)
 * @param env - Environment (prod, testnet, stage)
 */
export function useBtcStakeAndBake(
  protocol: DeployProtocol,
  partnerId?: string,
  env?: Env,
) {
  const [sdk, setSdk] = useState<LombardSDK | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string | null>(null);
  const [status, setStatus] = useState<StakeAndBakeStatus>({
    phase: 'idle',
    message: 'Ready to stake and bake',
  });
  const [progress, setProgress] = useState<StakeAndBakeProgress>({});

  // Initialize SDK
  useEffect(() => {
    let mounted = true;

    async function initSdk() {
      try {
        setIsInitializing(true);

        const config = createConfig({
          env: env ?? getEnvironment(),
          providers: {
            ...(window.ethereum && { evm: () => window.ethereum! }),
          },
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

    initSdk();

    return () => {
      mounted = false;
    };
  }, [partnerId, env]);

  /**
   * Start stake-and-bake process
   */
  const stakeAndBake = useCallback(
    async (params: {
      amount: string;
      recipient: string;
      destChain: Chain;
      referralCode?: string;
    }) => {
      if (!sdk) {
        throw new Error('SDK not initialized');
      }

      try {
        setError(null);
        setStatus({
          phase: 'preparing',
          message: 'Creating stake-and-bake action...',
        });

        // Step 1: Create stakeAndDeploy action
        const currentEnv = env ?? getEnvironment();
        const action = sdk.chain.btc.stakeAndDeploy({
          assetOut: AssetId.LBTC,
          destChain: params.destChain,
          sourceChain:
            currentEnv === Env.prod
              ? Chain.BITCOIN_MAINNET
              : Chain.BITCOIN_SIGNET,
          protocol,
        });

        // Listen to status changes
        action.on('status-change', (...args: unknown[]) => {
          const newStatus = args[0] as BtcActionStatus;
          console.log('Status changed:', newStatus);

          const statusMapping: Record<string, StakeAndBakeStatus> = {
            [BtcActionStatus.IDLE]: {
              phase: 'idle',
              message: 'Initializing...',
            },
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

          setStatus(
            statusMapping[newStatus] || {
              phase: 'idle',
              message: String(newStatus),
            },
          );
        });

        // Listen to progress events
        action.on('progress', (...args: unknown[]) => {
          const progressData = args[0] as BtcStakeAndDeployProgress;
          console.log('Progress:', progressData);

          setProgress({
            confirmations: progressData.confirmations,
            requiredConfirmations: progressData.requiredConfirmations,
            isDeposited: progressData.isDeposited,
            isClaimed: progressData.isClaimed,
          });

          if (progressData.confirmations !== undefined) {
            const hasEnough = progressData.hasEnoughConfirmations ?? false;
            if (hasEnough && !progressData.isDeposited) {
              setStatus({
                phase: 'depositing',
                message: 'Minting LBTC and depositing to vault...',
              });
            } else if (!hasEnough) {
              setStatus({
                phase: 'confirming',
                message: 'Confirming transaction...',
              });
            }
          }

          if (progressData.isDeposited) {
            setStatus({
              phase: 'complete',
              message: 'Stake and bake complete!',
            });
          }
        });

        // Step 2: Prepare with amount and recipient
        setStatus({ phase: 'preparing', message: 'Preparing parameters...' });
        await action.prepare({
          amount: params.amount,
          recipient: params.recipient,
          ...(params.referralCode && { referralCode: params.referralCode }),
        });

        // Step 3: Authorize vault deposit
        if (action.status === BtcActionStatus.NEEDS_DEPLOY_AUTHORIZATION) {
          setStatus({
            phase: 'authorizing',
            message: 'Authorizing vault deposit...',
          });
          await action.authorizeDeposit();
        }

        // Step 4: Generate deposit address
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
        console.error('Stake and bake failed:', err);
        setError(err instanceof Error ? err.message : 'Stake and bake failed');
        setStatus({
          phase: 'error',
          message: 'Failed to create stake and bake',
        });
        throw err;
      }
    },
    [sdk, env, protocol],
  );

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setDepositAddress(null);
    setStakeAmount(null);
    setStatus({ phase: 'idle', message: 'Ready to stake and bake' });
    setProgress({});
    setError(null);
  }, []);

  return {
    sdk,
    stakeAndBake,
    reset,
    isInitializing,
    error,
    depositAddress,
    stakeAmount,
    status,
    progress,
  };
}
