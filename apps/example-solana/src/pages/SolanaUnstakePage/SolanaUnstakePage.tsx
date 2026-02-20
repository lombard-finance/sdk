import { Env } from '@lombard.finance/sdk';
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
  const [sourceChain, setSourceChain] = useState('');
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

          <div className="mt-8 card">
            <h3 className="font-semibold mb-3">How it works</h3>
            <ol className="space-y-2 text-sm text-secondary">
              <li className="flex gap-2">
                <span className="font-semibold">1.</span>
                <span>
                  Connect your Solana wallet (Phantom) containing LBTC
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">2.</span>
                <span>Enter the amount of LBTC to burn on Solana</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">3.</span>
                <span>Provide your Bitcoin address to receive BTC</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">4.</span>
                <span>Sign the transaction in your Phantom wallet</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">5.</span>
                <span>
                  Wait for confirmation - BTC will be released to your Bitcoin
                  address automatically
                </span>
              </li>
            </ol>
          </div>

          <div className="mt-6 card bg-gradient-to-r from-purple-50 to-blue-50">
            <h3 className="font-semibold mb-3">Solana Network</h3>
            <div className="text-sm space-y-2">
              <p>
                <strong>Current Environment:</strong>{' '}
                {env === Env.prod ? 'Production (Mainnet)' : 'Testnet (Devnet)'}
              </p>
              <p>
                <strong>Source Chain:</strong>{' '}
                {env === Env.prod ? 'Solana Mainnet' : 'Solana Devnet'}
              </p>
              <p>
                <strong>Destination:</strong>{' '}
                {env === Env.prod ? 'Bitcoin Mainnet' : 'Bitcoin Signet'}
              </p>
              <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-xs text-secondary">
                  <strong>Note:</strong> Ensure your Phantom wallet is on the
                  correct network. For production, use Mainnet mode. For
                  testnet, use Devnet mode (Settings → Developer Settings →
                  Testnet Mode).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
