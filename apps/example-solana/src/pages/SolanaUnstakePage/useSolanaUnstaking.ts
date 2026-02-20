import {
  AssetId,
  Chain,
  createConfig,
  createLombardSDK,
  Env,
  type LombardSDK,
  NonEvmUnstakeStatus,
} from '@lombard.finance/sdk';
import { solanaModule } from '@lombard.finance/sdk-solana';
import { useCallback, useEffect, useState } from 'react';

import { getEnvironment } from '../../lib/config';

/**
 * Form data for Solana unstaking
 */
export interface SolanaUnstakingFormData {
  amount: string;
  sourceChain: Chain;
  destChain: Chain;
  recipient: string; // Bitcoin address
  assetOut: AssetId;
}

/**
 * Unstaking status for UI
 */
export interface SolanaUnstakingStatus {
  phase: 'idle' | 'preparing' | 'executing' | 'complete' | 'error';
  message: string;
}

/**
 * Hook for managing Solana unstaking flow (LBTC → BTC)
 *
 * Handles SDK initialization, unstake action lifecycle (burn LBTC on Solana -> receive BTC on Bitcoin)
 *
 * Note: Partner ID is not required for unstaking as it's a pure on-chain operation.
 */
export function useSolanaUnstaking(solanaAddress?: string | null, env?: Env) {
  const [sdk, setSdk] = useState<LombardSDK | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [status, setStatus] = useState<SolanaUnstakingStatus>({
    phase: 'idle',
    message: 'Ready to unstake',
  });

  // Initialize SDK
  useEffect(() => {
    let mounted = true;

    async function initSdk() {
      try {
        setIsInitializing(true);

        // Create config first to ensure built-in modules are merged
        const config = createConfig({
          env: env ?? getEnvironment(),
          ...(window.solana && {
            providers: {
              solana: () => window.solana!,
            },
          }),
          modules: [solanaModule()],
        });

        // Then create SDK from config
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

    if (solanaAddress) {
      initSdk();
    }

    return () => {
      mounted = false;
    };
  }, [solanaAddress, env]);

  /**
   * Start unstaking process
   */
  const unstake = useCallback(
    async (formData: SolanaUnstakingFormData) => {
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

        const action = sdk.chain.solana.unstake({
          assetIn: AssetId.LBTC,
          assetOut: formData.assetOut,
          sourceChain: formData.sourceChain,
          destChain: formData.destChain,
        });

        // Listen to status changes
        action.on('status-change', (...args: unknown[]) => {
          const newStatus = args[0] as NonEvmUnstakeStatus;
          console.log('Status changed:', newStatus);

          const statusMap: Record<NonEvmUnstakeStatus, SolanaUnstakingStatus> =
            {
              [NonEvmUnstakeStatus.IDLE]: { phase: 'idle', message: 'Ready' },
              [NonEvmUnstakeStatus.READY]: {
                phase: 'preparing',
                message: 'Ready to execute',
              },
              [NonEvmUnstakeStatus.CONFIRMING]: {
                phase: 'executing',
                message: 'Burning LBTC...',
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

        // Step 2: Prepare with amount and recipient (Bitcoin address)
        setStatus({
          phase: 'preparing',
          message: 'Preparing unstake parameters...',
        });
        await action.prepare({
          amount: formData.amount,
          recipient: formData.recipient,
        });

        // Step 3: Execute the unstake transaction
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

        // Handle wallet network mismatch error
        const errorMessage =
          err instanceof Error ? err.message : 'Unstaking failed';
        if (
          errorMessage.includes('toBase58') &&
          errorMessage.includes('null')
        ) {
          const enhancedError =
            'Wallet network mismatch: Your Solana wallet appears to be in testnet mode ' +
            'but you are trying to sign a mainnet transaction. Please switch your wallet ' +
            'to mainnet mode (Settings → Developer Settings → Testnet Mode: OFF in Phantom).';
          setError(enhancedError);
          setStatus({ phase: 'error', message: enhancedError });
        } else {
          setError(errorMessage);
          setStatus({ phase: 'error', message: errorMessage });
        }
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
