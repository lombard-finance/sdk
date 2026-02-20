import { Env } from '@lombard.finance/sdk';
import { useState } from 'react';

import { StakingForm } from '../../components/StakingForm';
import { StakingProgress } from '../../components/StakingProgress';
import { WalletConnect } from '../../components/WalletConnect';
import type { StakingFormData } from '../../lib/types';
import { useBtcStakingEvm } from './useBtcStakingEvm';

interface SimpleStakingPageProps {
  env: Env;
  onReset?: () => void;
}

/**
 * Simple Bitcoin Staking Example Page
 *
 * Demonstrates basic BTC -> LBTC staking flow using Lombard SDK:
 * 1. (Optional) Connect EVM wallet for enhanced features
 * 2. User inputs staking parameters (amount, destination chain)
 * 3. SDK generates a Bitcoin deposit address
 * 4. User sends BTC to the address
 * 5. SDK monitors the transaction and auto-mints LBTC
 */
export function SimpleStakingPage({ env, onReset }: SimpleStakingPageProps) {
  const [isStaking, setIsStaking] = useState(false);
  const [partnerId, setPartnerId] = useState('');

  const {
    stake,
    isInitializing,
    error: sdkError,
    depositAddress,
    stakeAmount,
    status,
    progress,
    reset,
  } = useBtcStakingEvm(partnerId, env);

  const handleStartStaking = async (formData: StakingFormData) => {
    setIsStaking(true);
    try {
      await stake(formData);
    } catch (err) {
      console.error('Staking failed:', err);
      setIsStaking(false);
    }
  };

  const handleReset = () => {
    reset();
    setIsStaking(false);
    onReset?.();
  };

  return (
    <div className="py-8">
      <div className="container">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-4 text-primary">
              Simple Bitcoin Staking
            </h1>
            <p className="text-secondary text-lg">
              Stake your BTC to receive LBTC using the Lombard SDK
            </p>
          </div>

          {/* Wallet Connection (optional) */}
          <div className="mb-6">
            <WalletConnect />
          </div>

          {/* Partner ID Configuration */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <label
              htmlFor="partnerId"
              className="block text-sm font-medium mb-2 text-amber-900"
            >
              Partner ID (Required)
            </label>
            <input
              id="partnerId"
              type="text"
              value={partnerId}
              onChange={e => setPartnerId(e.target.value)}
              placeholder="Enter your partner ID"
              className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-capital-green bg-white"
              disabled={isStaking}
            />
            <p className="text-xs text-amber-700 mt-1">
              Partner ID is required to perform staking operations. Contact
              Lombard Finance to obtain your partner ID.
            </p>
          </div>

          {sdkError && (
            <div className="card mb-6 bg-red-50 border border-red-200">
              <h3 className="text-error font-semibold mb-2">SDK Error</h3>
              <p className="text-sm text-error">{sdkError}</p>
            </div>
          )}

          {!isStaking ? (
            <StakingForm
              env={env}
              onSubmit={handleStartStaking}
              isLoading={isInitializing}
              disabled={!partnerId || isInitializing}
            />
          ) : (
            <StakingProgress
              depositAddress={depositAddress}
              amount={stakeAmount}
              status={status}
              progress={progress}
              onReset={handleReset}
            />
          )}

          <div className="mt-8 card">
            <h3 className="font-semibold mb-3">How it works</h3>
            <ol className="space-y-2 text-sm text-secondary">
              <li className="flex gap-2">
                <span className="font-semibold">1.</span>
                <span>
                  Enter the amount of BTC you want to stake and select
                  destination chain
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">2.</span>
                <span>
                  Click "Generate Deposit Address" to create a unique Bitcoin
                  address
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">3.</span>
                <span>Send BTC from your wallet to the provided address</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">4.</span>
                <span>
                  Wait for confirmations (the SDK monitors automatically)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">5.</span>
                <span>
                  LBTC is automatically minted to your destination address
                </span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
