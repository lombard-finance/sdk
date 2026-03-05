import { Chain, Env } from '@lombard.finance/sdk';
import { useState } from 'react';

import { SolanaWalletConnect } from '../../components/SolanaWalletConnect';
import { StakingForm } from '../../components/StakingForm';
import { StakingProgress } from '../../components/StakingProgress';
import { useSolanaWallet } from '../../hooks/useSolanaWallet';
import type { StakingFormData } from '../../lib/types';
import { useBtcStakingSolana } from './useBtcStakingSolana';

interface SolanaStakePageProps {
  env: Env;
}

/**
 * Get Solana destination chain based on environment
 */
function getSolanaChain(env: Env): Chain {
  switch (env) {
    case Env.prod:
      return Chain.SOLANA_MAINNET;
    case Env.testnet:
    case Env.stage:
    default:
      return Chain.SOLANA_DEVNET;
  }
}

/**
 * Solana Stake Example Page
 *
 * Demonstrates BTC → LBTC staking with Solana as destination:
 * 1. Connect Solana wallet (required for signing destination address)
 * 2. Enter BTC amount and Solana address
 * 3. Generate Bitcoin deposit address
 * 4. Send BTC to deposit address
 * 5. Receive LBTC on Solana
 *
 * Note: Partner ID is required for this example (no reCAPTCHA integration).
 */
export function SolanaStakePage({ env }: SolanaStakePageProps) {
  const [isStaking, setIsStaking] = useState(false);
  const [partnerId, setPartnerIdState] = useState(
    () => localStorage.getItem('lombard-partnerId') || 'test',
  );
  const { address: solanaAddress } = useSolanaWallet();

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
  } = useBtcStakingSolana(partnerId, env);

  const handleStartStaking = async (formData: StakingFormData) => {
    setIsStaking(true);
    try {
      // Override destChain to be Solana
      await stake({
        ...formData,
        destChain: getSolanaChain(env),
      });
    } catch (err) {
      console.error('Staking failed:', err);
      setIsStaking(false);
    }
  };

  const handleReset = () => {
    reset();
    setIsStaking(false);
  };

  return (
    <div className="py-8">
      <div className="container">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-4 text-primary">
              Stake BTC to Solana
            </h1>
            <p className="text-secondary text-lg">
              Stake BTC to receive LBTC on Solana using the Lombard SDK
            </p>
          </div>

          {/* Solana Wallet Connection (optional but recommended) */}
          <div className="mb-6">
            <SolanaWalletConnect />
            {!solanaAddress && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  💡 Connect Solana wallet to auto-fill your destination address
                </p>
              </div>
            )}
          </div>

          {/* Partner ID Configuration (Required) */}
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
              onSubmit={handleStartStaking}
              isLoading={isInitializing}
              disabled={!partnerId || isInitializing}
              env={env}
              solanaAddress={solanaAddress}
              fixedDestChain={getSolanaChain(env)}
            />
          ) : (
            <StakingProgress
              depositAddress={depositAddress}
              amount={stakeAmount}
              status={status}
              progress={progress}
              onReset={handleReset}
              targetChain="Solana"
            />
          )}

        </div>
      </div>
    </div>
  );
}
