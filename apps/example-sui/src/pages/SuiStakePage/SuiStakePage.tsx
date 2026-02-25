import { Chain, Env } from '@lombard.finance/sdk';
import { useEffect, useState } from 'react';

import { StakingForm } from '../../components/StakingForm';
import { StakingProgress } from '../../components/StakingProgress';
import { SuiWalletConnect } from '../../components/SuiWalletConnect';
import { useSuiWallet } from '../../hooks/useSuiWallet';
import type { StakingFormData } from '../../lib/types';
import { useBtcStakingSui } from './useBtcStakingSui';

interface SuiStakePageProps {
  env: Env;
}

/**
 * Get Sui destination chain based on environment
 */
function getSuiChain(env: Env): Chain {
  switch (env) {
    case Env.prod:
      return Chain.SUI_MAINNET;
    case Env.testnet:
    case Env.stage:
    default:
      return Chain.SUI_TESTNET;
  }
}

/**
 * Sui Stake Example Page
 *
 * Demonstrates BTC → LBTC staking with Sui as destination:
 * 1. Connect Sui wallet (required for signing destination address)
 * 2. Enter BTC amount and Sui address
 * 3. Generate Bitcoin deposit address
 * 4. Send BTC to deposit address
 * 5. Receive LBTC on Sui
 *
 * Note: Partner ID is required for this example (no reCAPTCHA integration).
 */
export function SuiStakePage({ env }: SuiStakePageProps) {
  const [isStaking, setIsStaking] = useState(false);
  const [partnerId, setPartnerId] = useState(env !== Env.prod ? 'test' : '');

  useEffect(() => {
    setPartnerId(env !== Env.prod ? 'test' : '');
  }, [env]);

  const {
    address: suiAddress,
    wallet: suiWallet,
    walletAccount: suiWalletAccount,
  } = useSuiWallet();

  const {
    stake,
    isInitializing,
    error: sdkError,
    depositAddress,
    stakeAmount,
    status,
    progress,
    reset,
  } = useBtcStakingSui(suiWallet, suiWalletAccount, partnerId, env);

  const handleStartStaking = async (formData: StakingFormData) => {
    setIsStaking(true);
    try {
      // Override destChain to be Sui
      await stake({
        ...formData,
        destChain: getSuiChain(env),
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
              Stake BTC to Sui
            </h1>
            <p className="text-secondary text-lg">
              Stake BTC to receive LBTC on Sui using the Lombard SDK
            </p>
          </div>

          {/* Sui Wallet Connection (optional but recommended) */}
          <div className="mb-6">
            <SuiWalletConnect />
            {!suiAddress && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  💡 Connect Sui wallet to auto-fill your destination address
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
              solanaAddress={suiAddress}
              fixedDestChain={getSuiChain(env)}
            />
          ) : (
            <StakingProgress
              depositAddress={depositAddress}
              amount={stakeAmount}
              status={status}
              progress={progress}
              onReset={handleReset}
              targetChain="Sui"
            />
          )}

          <div className="mt-8 card">
            <h3 className="font-semibold mb-3">How it works</h3>
            <ol className="space-y-2 text-sm text-secondary">
              <li className="flex gap-2">
                <span className="font-semibold">1.</span>
                <span>
                  Connect your Sui wallet (Sui Wallet or Suiet) to auto-fill
                  destination address
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">2.</span>
                <span>Enter the amount of BTC you want to stake</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">3.</span>
                <span>
                  SDK generates a unique Bitcoin deposit address for you
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">4.</span>
                <span>Send BTC to this address from any Bitcoin wallet</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">5.</span>
                <span>
                  Wait for Bitcoin confirmations (6 blocks recommended)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">6.</span>
                <span>
                  LBTC will be automatically minted to your Sui address
                </span>
              </li>
            </ol>
          </div>

          <div className="mt-6 card bg-gradient-to-r from-blue-50 to-purple-50">
            <h3 className="font-semibold mb-3">Sui Destination</h3>
            <div className="text-sm space-y-2">
              <p>
                <strong>Environment:</strong>{' '}
                {env === Env.prod ? 'Production (Mainnet)' : 'Testnet'}
              </p>
              <p>
                <strong>Source:</strong>{' '}
                {env === Env.prod ? 'Bitcoin Mainnet' : 'Bitcoin Signet'}
              </p>
              <p>
                <strong>Destination:</strong>{' '}
                {env === Env.prod ? 'Sui Mainnet' : 'Sui Testnet'}
              </p>
              <p>
                <strong>Asset:</strong> LBTC (Liquid Bitcoin Token on Sui)
              </p>
              <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-xs text-secondary">
                  <strong>Advantage:</strong> Receive LBTC directly on Sui to
                  use in Sui DeFi protocols, with fast transaction finality and
                  low fees powered by Sui's Move-based architecture.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 card bg-blue-50 border-blue-200">
            <h3 className="font-semibold mb-3 text-blue-900">
              Why Stake to Sui?
            </h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-capital-green">✓</span>
                <span>
                  <strong>Ultra-fast finality:</strong> Sui's parallel execution
                  enables instant transaction confirmation
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-capital-green">✓</span>
                <span>
                  <strong>Minimal fees:</strong> Consistently low transaction
                  costs
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-capital-green">✓</span>
                <span>
                  <strong>Move-based security:</strong> Benefit from Sui's
                  resource-oriented programming model
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-capital-green">✓</span>
                <span>
                  <strong>Growing DeFi ecosystem:</strong> Access emerging Sui
                  DeFi protocols with your LBTC
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
