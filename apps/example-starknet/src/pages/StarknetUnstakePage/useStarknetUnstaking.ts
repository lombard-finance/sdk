import {
  AssetId,
  createConfig,
  createLombardSDK,
  Env,
  type LombardSDK,
  NonEvmUnstakeStatus,
} from '@lombard.finance/sdk';
import {
  getRpcProvider,
  StarknetChainId,
  starknetModule,
} from '@lombard.finance/sdk-starknet';
import { useCallback, useEffect, useState } from 'react';
import { WalletAccount } from 'starknet';

import { getEnvironment } from '../../lib/config';
import type { UnstakingFormData, UnstakingStatus } from '../../lib/types';

/**
 * Hook for managing Starknet unstaking flow (LBTC → BTC)
 *
 * Handles SDK initialization with Starknet module, unstake action lifecycle, and event monitoring
 *
 * @param starknetAddress - Starknet wallet address
 * @param env - Environment (prod, testnet, stage)
 * @param starknetProvider - Starknet wallet provider (from useStarknetWallet)
 * @param walletId - Wallet ID (braavos or argentX)
 */
export function useStarknetUnstaking(
  starknetAddress?: string | null,
  env?: Env,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  starknetProvider?: any,
  walletId?: string | null,
) {
  const [sdk, setSdk] = useState<LombardSDK | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [status, setStatus] = useState<UnstakingStatus>({
    phase: 'idle',
    message: 'Ready to unstake',
  });

  // Initialize SDK with Starknet module
  useEffect(() => {
    let mounted = true;

    async function initSdk() {
      try {
        setIsInitializing(true);

        // Create Starknet provider adapter using WalletAccount
        let starknetProviderAdapter;

        if (starknetProvider && starknetAddress && walletId) {
          try {
            // Get RPC provider for current environment
            const chainId =
              env === Env.prod
                ? StarknetChainId.SN_MAIN
                : StarknetChainId.SN_SEPOLIA;
            const rpcProvider = getRpcProvider(chainId);

            // Create WalletAccount
            const walletAccount = await WalletAccount.connect(
              rpcProvider,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              starknetProvider as any,
            );

            starknetProviderAdapter = {
              getProvider: () => walletAccount,
            };
          } catch (err) {
            console.warn(
              'Failed to create WalletAccount, using fallback:',
              err,
            );
            // Fallback: use provider directly
            starknetProviderAdapter = {
              getProvider: () => starknetProvider,
            };
          }
        }

        // Step 1: Create config with Starknet module
        const config = createConfig({
          env: env ?? getEnvironment(),
          ...(starknetProviderAdapter && {
            providers: {
              starknet: () => starknetProviderAdapter,
            },
          }),
          modules: [starknetModule()],
        });

        // Step 2: Create SDK from config
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

    if (starknetAddress) {
      initSdk();
    }

    return () => {
      mounted = false;
    };
  }, [starknetAddress, env, starknetProvider, walletId]);

  const unstake = useCallback(
    async (formData: UnstakingFormData) => {
      if (!sdk) {
        throw new Error('SDK not initialized');
      }

      try {
        setStatus({ phase: 'preparing', message: 'Initializing unstake...' });
        setError(null);

        // Create unstake action
        const action = sdk.chain.starknet.unstake({
          assetIn: AssetId.LBTC,
          assetOut: AssetId.BTC,
          sourceChain: formData.sourceChain,
          destChain: formData.destChain,
        });

        // Listen to status changes
        action.on('status-change', (...args: unknown[]) => {
          const newStatus = args[0] as NonEvmUnstakeStatus;
          console.log('Starknet unstake status changed:', newStatus);

          const statusMap: Record<NonEvmUnstakeStatus, UnstakingStatus> = {
            [NonEvmUnstakeStatus.IDLE]: { phase: 'idle', message: 'Ready' },
            [NonEvmUnstakeStatus.READY]: {
              phase: 'ready',
              message: 'Ready to execute',
            },
            [NonEvmUnstakeStatus.CONFIRMING]: {
              phase: 'confirming',
              message: 'Confirming transaction...',
            },
            [NonEvmUnstakeStatus.COMPLETED]: {
              phase: 'complete',
              message: 'Unstake complete!',
            },
          };

          const mappedStatus = statusMap[newStatus];
          if (mappedStatus) {
            setStatus(mappedStatus);
          }
        });

        // Prepare with amount and recipient
        setStatus({
          phase: 'preparing',
          message: 'Preparing unstake parameters...',
        });
        await action.prepare({
          amount: formData.amount,
          recipient: formData.recipient,
        });

        // Execute the unstake
        setStatus({
          phase: 'executing',
          message: 'Burning LBTC on Starknet...',
        });
        const result = await action.execute();

        setTxHash(result.txHash);
        setStatus({
          phase: 'complete',
          message: 'Unstake complete! BTC will be released.',
        });
      } catch (err) {
        console.error('Unstake failed:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Unstake failed';
        setError(errorMessage);
        setStatus({ phase: 'error', message: errorMessage });
        throw err;
      }
    },
    [sdk],
  );

  const reset = useCallback(() => {
    setTxHash(null);
    setStatus({ phase: 'idle', message: 'Ready to unstake' });
    setError(null);
  }, []);

  return {
    unstake,
    reset,
    isInitializing,
    error,
    txHash,
    status,
  };
}
