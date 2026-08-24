import { type Chain, Env } from '@lombard.finance/sdk';
import { useState } from 'react';

import { SolanaUnstakingForm } from '../../components/SolanaUnstakingForm';
import { SolanaUnstakingProgress } from '../../components/SolanaUnstakingProgress';
import { SolanaWalletConnect } from '../../components/SolanaWalletConnect';
import { useSolanaWallet } from '../../hooks/useSolanaWallet';
import type { SolanaUnstakingFormData } from './useSolanaUnstaking';
import { useSolanaUnstaking } from './useSolanaUnstaking';

interface SolanaUnstakePageProps {
  env: Env;
  onReset?: () => void;
}

/**
 * Solana Unstake Example Page
 *
 * Demonstrates LBTC -> BTC unstaking flow on Solana:
 * 1. Connect Solana wallet (Phantom, required for transaction signing)
 * 2. Enter amount of LBTC to burn and Bitcoin recipient address
 * 3. Execute burn transaction on Solana
 * 4. Receive BTC on Bitcoin network
 *
 * Note: Partner ID is not required for unstaking (pure on-chain operation).
 */
export function SolanaUnstakePage({ env, onReset }: SolanaUnstakePageProps) {
  const [isUnstaking, setIsUnstaking] = useState(false);
  // `Chain | null` rather than `''`: the empty string is not a chain, and
  // typing it as one is what let a bare string reach the explorer lookup.
  const [sourceChain, setSourceChain] = useState<Chain | null>(null);
  const { address: solanaAddress } = useSolanaWallet();

  const {
    unstake,
    isInitializing,
    error: sdkError,
    txHash,
    status,
    reset,
  } = useSolanaUnstaking(solanaAddress, env);

  const handleStartUnstaking = async (formData: SolanaUnstakingFormData) => {
    setIsUnstaking(true);
    setSourceChain(formData.sourceChain);
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
    onReset?.();
  };

  return (
    <div className="py-8">
      <div className="container">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-4 text-primary">
              Solana LBTC Unstake
            </h1>
            <p className="text-secondary text-lg">
              Burn LBTC on Solana to receive BTC on Bitcoin using the Lombard
              SDK
            </p>
          </div>

          {/* Wallet Connection (required) */}
          <div className="mb-6">
            <SolanaWalletConnect />
            {!solanaAddress && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-900">
                  ⚠️ Solana wallet connection is required to sign unstake
                  transactions
                </p>
              </div>
            )}
          </div>

          {sdkError && (
            <div className="card mb-6 bg-red-50 border border-red-200">
              <h3 className="text-error font-semibold mb-2">SDK Error</h3>
              <p className="text-sm text-error">{sdkError}</p>
            </div>
          )}

          {!isUnstaking ? (
            <SolanaUnstakingForm
              env={env}
              onSubmit={handleStartUnstaking}
              isLoading={isInitializing}
              disabled={!solanaAddress || isInitializing}
            />
          ) : (
            <SolanaUnstakingProgress
              txHash={txHash}
              status={status}
              sourceChain={sourceChain}
              onReset={handleReset}
            />
          )}
        </div>
      </div>
    </div>
  );
}
