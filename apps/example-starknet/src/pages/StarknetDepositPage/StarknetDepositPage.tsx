import { Chain, Env } from '@lombard.finance/sdk';
import { useState } from 'react';

import { DepositForm } from '../../components/DepositForm';
import { DepositingProgress } from '../../components/DepositingProgress';
import { StarknetWalletConnect } from '../../components/StarknetWalletConnect';
import { useStarknetWallet } from '../../hooks/useStarknetWallet';
import { useBtcDepositStarknet } from './useBtcDepositStarknet';

/**
 * Starknet Stake Page
 *
 * Example: Stake BTC → LBTC (on Starknet)
 *
 * Demonstrates:
 * - Connecting Starknet wallet
 * - Preparing stake with Starknet destination
 * - Authorizing with Starknet signature
 * - Generating Bitcoin deposit address
 * - Monitoring stake lifecycle with events
 *
 * Note: Partner ID is required for this example (no reCAPTCHA integration).
 */
export function StarknetDepositPage({ env }: { env: Env }) {
  const [isStaking, setIsStaking] = useState(false);
  const [partnerId, setPartnerIdState] = useState(
    () => localStorage.getItem('lombard-partnerId') || 'test',
  );

  const setPartnerId = (value: string) => {
    setPartnerIdState(value);
    localStorage.setItem('lombard-partnerId', value);
  };

  const {
    address: starknetAddress,
    isConnected: isStarknetConnected,
    isConnecting: isStarknetConnecting,
    error: starknetWalletError,
    walletId: starknetWalletId,
    provider: starknetProvider,
    connect: connectStarknet,
    disconnect: disconnectStarknet,
    installedWallets: starknetInstalledWallets,
  } = useStarknetWallet();

  const {
    stake,
    reset,
    isInitializing,
    error,
    depositAddress,
    status,
    stakeAmount,
    progress,
  } = useBtcDepositStarknet(starknetProvider, partnerId, env, starknetWalletId);

  const handleStartStaking = async (formData: Parameters<typeof stake>[0]) => {
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
  };

  return (
    <div className="py-8">
      <div className="container">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-4 text-primary">
              Stake BTC to Starknet
            </h1>
            <p className="text-secondary text-lg">
              Stake BTC to receive LBTC on Starknet using the Lombard SDK
            </p>
          </div>

          {/* Starknet Wallet Connection */}
          <div className="mb-6">
            <StarknetWalletConnect
              address={starknetAddress}
              isConnected={isStarknetConnected}
              isConnecting={isStarknetConnecting}
              error={starknetWalletError}
              walletId={starknetWalletId}
              connect={connectStarknet}
              disconnect={disconnectStarknet}
              installedWallets={starknetInstalledWallets}
            />
            {!starknetAddress && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  💡 Connect Starknet wallet to auto-fill your destination
                  address
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

          {error && (
            <div className="card mb-6 bg-red-50 border border-red-200">
              <h3 className="text-error font-semibold mb-2">SDK Error</h3>
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {!isStaking ? (
            <DepositForm
              onSubmit={handleStartStaking}
              isLoading={isInitializing}
              disabled={!isStarknetConnected || !partnerId}
              solanaAddress={starknetAddress}
              fixedDestChain={
                env === Env.prod
                  ? Chain.STARKNET_MAINNET
                  : Chain.STARKNET_SEPOLIA
              }
              env={env}
            />
          ) : (
            <DepositingProgress
              status={status}
              depositAddress={depositAddress}
              amount={stakeAmount}
              progress={progress}
              onReset={handleReset}
              targetChain="Starknet"
            />
          )}
        </div>
      </div>
    </div>
  );
}
