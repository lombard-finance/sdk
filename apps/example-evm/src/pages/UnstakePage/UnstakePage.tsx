import { Env } from '@lombard.finance/sdk';
import { useState } from 'react';

import { UnstakingForm } from '../../components/UnstakingForm';
import { UnstakingProgress } from '../../components/UnstakingProgress';
import { WalletConnect } from '../../components/WalletConnect';
import { useEvmWallet } from '../../hooks/useEvmWallet';
import type { UnstakingFormData } from './useEvmUnstaking';
import { useEvmUnstaking } from './useEvmUnstaking';

interface UnstakePageProps {
  env: Env;
  onReset?: () => void;
}

/**
 * Unstake Example Page
 *
 * Demonstrates LBTC -> BTC/BTCb unstaking flow:
 * 1. Connect EVM wallet (required for transaction signing)
 * 2. Select output asset (BTC cross-chain or BTC.b same-chain)
 * 3. Enter amount and recipient address
 * 4. Execute burn transaction
 * 5. Receive BTC/BTC.b at recipient address
 *
 * Note: Partner ID is not required for unstaking (pure on-chain operation).
 */
export function UnstakePage({ env, onReset }: UnstakePageProps) {
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [sourceChain, setSourceChain] = useState('');
  const { address: evmAddress } = useEvmWallet();

  const {
    unstake,
    isInitializing,
    error: sdkError,
    txHash,
    status,
    reset,
  } = useEvmUnstaking(evmAddress, env);

  const handleStartUnstaking = async (formData: UnstakingFormData) => {
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
              Unstake LBTC
            </h1>
            <p className="text-secondary text-lg">
              Burn LBTC to receive BTC or BTC.b using the Lombard SDK
            </p>
          </div>

          {/* Wallet Connection (required) */}
          <div className="mb-6">
            <WalletConnect />
            {!evmAddress && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-900">
                  ⚠️ EVM wallet connection is required to sign unstake
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
            <UnstakingForm
              env={env}
              onSubmit={handleStartUnstaking}
              isLoading={isInitializing}
              disabled={!evmAddress || isInitializing}
            />
          ) : (
            <UnstakingProgress
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
                <span>Connect your EVM wallet containing LBTC</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">2.</span>
                <span>
                  Choose output asset: BTC (cross-chain) or BTC.b (same chain)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">3.</span>
                <span>Enter the amount of LBTC to burn</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">4.</span>
                <span>
                  Provide recipient address (Bitcoin address for BTC, EVM
                  address for BTC.b)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">5.</span>
                <span>Sign the transaction in your wallet</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">6.</span>
                <span>
                  Wait for confirmation - BTC/BTC.b will be sent automatically
                </span>
              </li>
            </ol>
          </div>

          <div className="mt-6 card bg-gradient-to-r from-amber-50 to-orange-50">
            <h3 className="font-semibold mb-3">Output Asset Comparison</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-white rounded-lg border border-gray-200">
                <h4 className="font-semibold mb-2">BTC (Cross-chain)</h4>
                <ul className="space-y-1 text-secondary">
                  <li>✓ Native Bitcoin on Bitcoin network</li>
                  <li>✓ Higher liquidity and utility</li>
                  <li>✓ Cross-chain bridge involved</li>
                  <li>⏱ Longer processing time</li>
                </ul>
              </div>
              <div className="p-3 bg-white rounded-lg border border-gray-200">
                <h4 className="font-semibold mb-2">BTC.b (Same-chain)</h4>
                <ul className="space-y-1 text-secondary">
                  <li>✓ Wrapped BTC on same EVM chain</li>
                  <li>✓ Faster processing</li>
                  <li>✓ No bridge required</li>
                  <li>⚠ Limited to specific chains</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
