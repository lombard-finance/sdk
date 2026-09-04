import { Env } from '@lombard.finance/sdk';
import { useState } from 'react';

import { SuiWithdrawingForm } from '../../components/SuiWithdrawingForm';
import { SuiWithdrawingProgress } from '../../components/SuiWithdrawingProgress';
import { SuiWalletConnect } from '../../components/SuiWalletConnect';
import { useSuiWallet } from '../../hooks/useSuiWallet';
import type { WithdrawFormData } from '../../lib/types';
import { useSuiUnstaking } from './useSuiUnstaking';

interface SuiWithdrawPageProps {
  env: Env;
}

/**
 * Sui Unstake Example Page
 *
 * Demonstrates LBTC → BTC unstaking from Sui:
 * 1. Connect Sui wallet (required for signing transaction)
 * 2. Enter amount and Bitcoin recipient address
 * 3. Burn LBTC on Sui
 * 4. BTC will be released to recipient address
 *
 * Note: Partner ID is NOT required for unstaking (pure on-chain operation)
 */
export function SuiWithdrawPage({ env }: SuiWithdrawPageProps) {
  const [isUnstaking, setIsUnstaking] = useState(false);
  const {
    address: suiAddress,
    wallet: suiWallet,
    walletAccount: suiWalletAccount,
  } = useSuiWallet();

  const {
    unstake,
    reset,
    isInitializing,
    error: sdkError,
    txHash,
    status,
  } = useSuiUnstaking(suiAddress, env, suiWallet, suiWalletAccount);

  const handleStartUnstaking = async (formData: WithdrawFormData) => {
    setIsUnstaking(true);
    try {
      await unstake(formData);
    } catch (err) {
      console.error('Unstaking failed:', err);
      setIsUnstaking(false);
    }
  };

  const handleReset = () => {
    reset();
    setIsUnstaking(false);
  };

  return (
    <div className="py-8">
      <div className="container">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-4 text-primary">
              Unstake from Sui
            </h1>
            <p className="text-secondary text-lg">
              Burn LBTC on Sui to receive BTC on Bitcoin network
            </p>
          </div>

          {/* Sui Wallet Connection (Required) */}
          <div className="mb-6">
            <SuiWalletConnect />
          </div>

          {sdkError && (
            <div className="card mb-6 bg-red-50 border border-red-200">
              <h3 className="text-error font-semibold mb-2">SDK Error</h3>
              <p className="text-sm text-error">{sdkError}</p>
            </div>
          )}

          {!isUnstaking ? (
            <SuiWithdrawingForm
              onSubmit={handleStartUnstaking}
              isLoading={isInitializing}
              disabled={!suiAddress}
              env={env}
              suiAddress={suiAddress}
            />
          ) : (
            <SuiWithdrawingProgress
              txHash={txHash}
              status={status}
              onReset={handleReset}
              env={env}
            />
          )}
        </div>
      </div>
    </div>
  );
}
