import { Env } from '@lombard.finance/sdk';
import { useState } from 'react';

import { SuiUnstakingForm } from '../../components/SuiUnstakingForm';
import { SuiUnstakingProgress } from '../../components/SuiUnstakingProgress';
import { SuiWalletConnect } from '../../components/SuiWalletConnect';
import { useSuiWallet } from '../../hooks/useSuiWallet';
import type { UnstakingFormData } from '../../lib/types';
import { useSuiUnstaking } from './useSuiUnstaking';

interface SuiUnstakePageProps {
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
export function SuiUnstakePage({ env }: SuiUnstakePageProps) {
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

  const handleStartUnstaking = async (formData: UnstakingFormData) => {
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
            <SuiUnstakingForm
              onSubmit={handleStartUnstaking}
              isLoading={isInitializing}
              disabled={!suiAddress}
              env={env}
              suiAddress={suiAddress}
            />
          ) : (
            <SuiUnstakingProgress
              txHash={txHash}
              status={status}
              onReset={handleReset}
              env={env}
            />
          )}

          <div className="mt-8 card">
            <h3 className="font-semibold mb-3">How it works</h3>
            <ol className="space-y-2 text-sm text-secondary">
              <li className="flex gap-2">
                <span className="font-semibold">1.</span>
                <span>Connect your Sui wallet (Sui Wallet or Suiet)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">2.</span>
                <span>Enter the amount of LBTC you want to unstake</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">3.</span>
                <span>
                  Enter your Bitcoin address where you want to receive BTC
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">4.</span>
                <span>Sign the transaction with your Sui wallet</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">5.</span>
                <span>LBTC will be burned on Sui</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">6.</span>
                <span>BTC will be released to your Bitcoin address</span>
              </li>
            </ol>
          </div>

          <div className="mt-6 card bg-gradient-to-r from-blue-50 to-purple-50">
            <h3 className="font-semibold mb-3">Cross-Chain Flow</h3>
            <div className="text-sm space-y-2">
              <p>
                <strong>Environment:</strong>{' '}
                {env === Env.prod ? 'Production (Mainnet)' : 'Testnet'}
              </p>
              <p>
                <strong>Source:</strong>{' '}
                {env === Env.prod ? 'Sui Mainnet' : 'Sui Testnet'}
              </p>
              <p>
                <strong>Destination:</strong>{' '}
                {env === Env.prod ? 'Bitcoin Mainnet' : 'Bitcoin Signet'}
              </p>
              <p>
                <strong>Operation:</strong> Burn LBTC on Sui → Release BTC on
                Bitcoin
              </p>
              <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-xs text-secondary">
                  <strong>Pure On-Chain:</strong> This is a direct blockchain
                  operation. No centralized services or bridge intermediaries
                  are involved.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 card bg-green-50 border-green-200">
            <h3 className="font-semibold mb-3 text-green-900">Key Features</h3>
            <ul className="text-sm text-green-800 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-capital-green">✓</span>
                <span>
                  <strong>No Partner ID required:</strong> Pure on-chain
                  transaction
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-capital-green">✓</span>
                <span>
                  <strong>Fast execution:</strong> Sui's high throughput enables
                  quick confirmation
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-capital-green">✓</span>
                <span>
                  <strong>Direct release:</strong> BTC sent directly to your
                  Bitcoin address
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-capital-green">✓</span>
                <span>
                  <strong>Transparent:</strong> Track transaction on Sui
                  explorer
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-6 card">
            <h3 className="font-semibold mb-3">Important Notes</h3>
            <ul className="text-sm text-secondary space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-amber-600">⚠️</span>
                <span>
                  <strong>Wallet Required:</strong> You must have a Sui wallet
                  (Sui Wallet or Suiet) connected to sign the transaction
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600">⚠️</span>
                <span>
                  <strong>Gas Fees:</strong> Small amount of SUI required for
                  transaction gas
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">💡</span>
                <span>
                  <strong>Confirmation Time:</strong> BTC release may take some
                  time after Sui transaction confirms
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
