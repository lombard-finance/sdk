import { Env } from '@lombard.finance/sdk';
import { useState } from 'react';

import { StakingForm } from '../../components/StakingForm';
import { StakingProgress } from '../../components/StakingProgress';
import { WalletConnect } from '../../components/WalletConnect';
import { useEvmWallet } from '../../hooks/useEvmWallet';
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
  const [selectedChain, setSelectedChain] = useState('');
  const { isConnected } = useEvmWallet();
  const [partnerId, setPartnerIdState] = useState(
    () =>
      localStorage.getItem('lombard-partnerId') ||
      (env === Env.prod ? '' : 'test'),
  );

  const setPartnerId = (value: string) => {
    setPartnerIdState(value);
    localStorage.setItem('lombard-partnerId', value);
  };

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

  const chainLabels: Record<string, string> = {
    'eip155:1': 'Ethereum',
    'eip155:8453': 'Base',
    'eip155:56': 'BNB Chain',
    'eip155:747474': 'Katana',
    'eip155:146': 'Sonic',
    'eip155:143': 'Monad',
    'eip155:988': 'Stable',
    'eip155:11155111': 'Sepolia',
    'eip155:84532': 'Base Sepolia',
    'eip155:97': 'BNB Testnet',
    'eip155:43113': 'Fuji',
  };

  const handleStartStaking = async (formData: StakingFormData) => {
    setIsStaking(true);
    setSelectedChain(chainLabels[formData.destChain] || formData.destChain);
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
              onChange={(e) => setPartnerId(e.target.value)}
              placeholder="Enter your partner ID"
              className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-capital-green bg-white"
              disabled={isStaking}
            />
            <p className="text-xs text-amber-700 mt-1">
              Without a Partner ID, deposit address generation requires
              reCAPTCHA, which is not integrated in this example. Contact
              Lombard Finance to obtain one.
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
              isWalletConnected={isConnected}
            />
          ) : (
            <StakingProgress
              depositAddress={depositAddress}
              amount={stakeAmount}
              status={status}
              progress={progress}
              onReset={handleReset}
              targetChain={selectedChain}
            />
          )}
        </div>
      </div>
    </div>
  );
}
