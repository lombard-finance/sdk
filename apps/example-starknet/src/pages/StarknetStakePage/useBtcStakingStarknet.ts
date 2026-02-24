import { Chain, createConfig, Env } from '@lombard.finance/sdk';
import {
  getRpcProvider,
  StarknetChainId,
  starknetModule,
} from '@lombard.finance/sdk-starknet';
import { useBtcStake, useLombardSDK } from '@lombard.finance/sdk-react';
import { useCallback, useEffect, useState } from 'react';
import { WalletAccount } from 'starknet';

import { getEnvironment } from '../../lib/config';
import type { StakingFormData } from '../../lib/types';

/**
 * Hook for managing Bitcoin staking to Starknet
 *
 * Handles SDK initialization with Starknet module, stake action lifecycle, and event monitoring
 *
 * @param starknetProvider - Starknet wallet provider (from useStarknetWallet)
 * @param partnerId - Partner ID to bypass reCAPTCHA (required without captcha integration)
 * @param env - Environment (prod, testnet, stage)
 */
export function useBtcStakingStarknet(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  starknetProvider?: any,
  partnerId?: string,
  env?: Env,
) {
  const currentEnv = env ?? getEnvironment();

  // Resolve WalletAccount asynchronously before passing to useLombardSDK
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [walletAccount, setWalletAccount] = useState<any>(null);

  useEffect(() => {
    if (!starknetProvider) {
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
  }, [starknetProvider, env]);

  const { sdk, isInitializing, error: sdkError } = useLombardSDK(
    () => {
      if (!walletAccount) return undefined;
      return createConfig({
        env: currentEnv,
        providers: {
          starknet: () => ({ getProvider: () => walletAccount }),
        },
        modules: [starknetModule()],
        ...(partnerId && { partner: { partnerId } }),
      });
    },
    [walletAccount, partnerId, currentEnv],
  );

  const {
    stake: stakeCore,
    reset,
    depositAddress,
    stakeAmount,
    status,
    progress,
    error: stakeError,
  } = useBtcStake(sdk);

  const sourceChain =
    currentEnv === Env.prod ? Chain.BITCOIN_MAINNET : Chain.BITCOIN_SIGNET;

  const stake = useCallback(
    (formData: StakingFormData) =>
      stakeCore({
        amount: formData.amount,
        destChain: formData.destChain,
        sourceChain,
        assetOut: formData.assetOut,
        recipient: formData.destAddress,
      }),
    [stakeCore, sourceChain],
  );

  return {
    sdk,
    stake,
    reset,
    isInitializing,
    error: sdkError ?? stakeError,
    depositAddress,
    stakeAmount,
    status,
    progress,
  };
}
