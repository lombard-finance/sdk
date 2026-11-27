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
 * @param walletId - Wallet ID (e.g. 'braavos', 'argentX') for fallback account wrapping
 */
export function useBtcStakingStarknet(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  starknetProvider?: any,
  partnerId?: string,
  env?: Env,
  walletId?: string | null,
) {
  const currentEnv = env ?? getEnvironment();

  // Resolve WalletAccount asynchronously before passing to useLombardSDK
  // The SDK's sign-message.ts requires walletAccount.walletProvider.name to be set.
  // WalletAccount.connect() may fail (common with Braavos), so we need a fallback
  // that wraps the raw provider with the expected walletProvider.name property.
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

    async function connectWalletAccount() {
      // Try WalletAccount.connect() first
      try {
        const account = await WalletAccount.connect(
          rpcProvider,
          starknetProvider,
        );
        setWalletAccount(account);
        return;
      } catch {
        // connect() failed, try fallback wrapping
      }

      // Fallback: wrap the provider's account with walletProvider.name
      // so the SDK's sign-message.ts can access it
      const wallet = starknetProvider as {
        account?: Record<string, unknown>;
        selectedAddress?: string;
        id?: string;
        name?: string;
      };

      if (wallet.account) {
        const walletName = wallet.name || wallet.id || walletId || 'Unknown';
        const wrappedAccount = Object.create(wallet.account) as WalletAccount;
        (wrappedAccount as unknown as Record<string, unknown>).walletProvider =
          {
            name: walletName,
            id: wallet.id || walletId || '',
          };
        setWalletAccount(wrappedAccount);
        return;
      }

      // Last resort: use raw provider (will fail at sign time)
      console.warn(
        '[useBtcStakingStarknet] Could not create WalletAccount with walletProvider.name',
      );
      setWalletAccount(starknetProvider);
    }

    void connectWalletAccount();
  }, [starknetProvider, walletId, env]);

  const {
    sdk,
    isInitializing,
    error: sdkError,
  } = useLombardSDK(() => {
    if (!walletAccount) return undefined;
    return createConfig({
      env: currentEnv,
      providers: {
        starknet: () => ({ getProvider: () => walletAccount }),
      },
      modules: [starknetModule()],
      ...(partnerId && { partner: { partnerId } }),
    });
  }, [walletAccount, partnerId, currentEnv]);

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
