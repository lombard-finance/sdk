import { createConfig, Env } from '@lombard.finance/sdk';
import {
  getRpcProvider,
  StarknetChainId,
  starknetModule,
} from '@lombard.finance/sdk-starknet';
import { useNonEvmUnstake, useLombardSDK } from '@lombard.finance/sdk-react';
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
  const currentEnv = env ?? getEnvironment();

  // Resolve WalletAccount asynchronously before passing to useLombardSDK
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [walletAccount, setWalletAccount] = useState<any>(null);

  useEffect(() => {
    if (!starknetProvider || !starknetAddress || !walletId) {
      setWalletAccount(null);
      return;
    }
    const chainId =
      env === Env.prod ? StarknetChainId.SN_MAIN : StarknetChainId.SN_SEPOLIA;
    const rpcProvider = getRpcProvider(chainId);
    WalletAccount.connect(rpcProvider, starknetProvider)
      .then(account => setWalletAccount(account))
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .catch(() => setWalletAccount(starknetProvider));
  }, [starknetProvider, starknetAddress, walletId, env]);

  const { sdk, isInitializing, error: sdkError } = useLombardSDK(
    () => {
      if (!starknetAddress) return undefined;
      return createConfig({
        env: currentEnv,
        ...(walletAccount && {
          providers: {
            starknet: () => ({ getProvider: () => walletAccount }),
          },
        }),
        modules: [starknetModule()],
      });
    },
    [starknetAddress, walletAccount, currentEnv],
  );

  const {
    unstake: unstakeCore,
    reset,
    txHash,
    status: unstakeStatus,
    error: unstakeError,
  } = useNonEvmUnstake(sdk, 'starknet');

  const status = unstakeStatus as UnstakingStatus;

  const unstake = useCallback(
    (formData: UnstakingFormData) =>
      unstakeCore({
        amount: formData.amount,
        sourceChain: formData.sourceChain,
        destChain: formData.destChain,
        recipient: formData.recipient,
      }),
    [unstakeCore],
  );

  return {
    unstake,
    reset,
    isInitializing,
    error: sdkError ?? unstakeError,
    txHash,
    status,
  };
}
