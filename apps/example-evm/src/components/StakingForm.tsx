import { AssetId, Chain, Env, isChain, MIN_STAKE_AMOUNT_BTC } from '@lombard.finance/sdk';
import { useCallback, useEffect, useState } from 'react';

import { getAvailableChains, getDefaultChain } from '../lib/chains';
import type { StakingFormData } from '../lib/types';

function WalletIcon() {
  return (
    <svg
      width="16"
      height="14"
      viewBox="0 0 16 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0.75 0H14.25H15V1.5H14.25H1.5V12.5H14.5V4.5H3.75H3V3H3.75H15.25H16V3.75V13.25V14H15.25H0.75H0V13.25V0.75V0H0.75ZM12 9.5C11.4375 9.5 11 9.0625 11 8.5C11 7.96875 11.4375 7.5 12 7.5C12.5312 7.5 13 7.96875 13 8.5C13 9.0625 12.5312 9.5 12 9.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

interface StakingFormProps {
  env: Env;
  onSubmit: (data: StakingFormData) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
  isWalletConnected?: boolean;
  solanaAddress?: string | null;
  fixedDestChain?: Chain;
}

/**
 * Form for configuring staking parameters
 */
export function StakingForm({
  env,
  onSubmit,
  isLoading,
  disabled = false,
  isWalletConnected = true,
  solanaAddress,
  fixedDestChain,
}: StakingFormProps) {
  const availableChains = getAvailableChains(env);

  const [amount, setAmount] = useState(String(MIN_STAKE_AMOUNT_BTC));
  const [destChain, setDestChain] = useState(
    fixedDestChain ?? getDefaultChain(env),
  );
  const [destAddress, setDestAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update destination chain when environment or fixedDestChain changes
  useEffect(() => {
    setDestChain(fixedDestChain ?? getDefaultChain(env));
  }, [env, fixedDestChain]);

  const isEvmChain =
    !destChain.includes('solana') && !destChain.includes('sui');

  // Show wallet button for Solana/Sui via prop, or for EVM if ethereum is available
  const showWalletButton = isEvmChain
    ? typeof window !== 'undefined' && typeof window.ethereum !== 'undefined'
    : !!solanaAddress;

  const handleUseWalletAddress = useCallback(async () => {
    if (!isEvmChain) {
      if (solanaAddress) setDestAddress(solanaAddress);
      return;
    }
    if (!window.ethereum) return;
    try {
      const accounts = (await window.ethereum.request({
        method: 'eth_accounts',
      })) as string[];
      if (accounts.length > 0) {
        setDestAddress(accounts[0]);
      }
    } catch {
      // Could not fetch wallet address
    }
  }, [isEvmChain, solanaAddress]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!destAddress) {
      alert('Please enter your destination address');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        amount,
        destChain,
        destAddress,
        assetOut: AssetId.LBTC,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2 className="text-2xl font-semibold mb-6">Stake BTC to LBTC</h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium mb-2">
            Amount (BTC)
          </label>
          <input
            id="amount"
            type="number"
            step="0.00000001"
            min={MIN_STAKE_AMOUNT_BTC}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green"
            placeholder={String(MIN_STAKE_AMOUNT_BTC)}
            required
          />
          <p className="text-xs text-secondary mt-1">
            Minimum: {MIN_STAKE_AMOUNT_BTC} BTC
          </p>
        </div>

        <div>
          <label htmlFor="destChain" className="block text-sm font-medium mb-2">
            Destination Chain
          </label>
          {fixedDestChain ? (
            <input
              id="destChain"
              type="text"
              value={
                availableChains.find((c) => c.value === destChain)?.label ??
                destChain
              }
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
            />
          ) : (
            <select
              id="destChain"
              value={destChain}
              onChange={(e) => {
                // A select hands back a string. `isChain` is the SDK's own
                // guard, so the state stays typed as `Chain` rather than
                // being cast into shape.
                if (isChain(e.target.value)) setDestChain(e.target.value);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green"
            >
              {availableChains.map((chain) => (
                <option key={chain.value} value={chain.value}>
                  {chain.label}
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-secondary mt-1">
            {fixedDestChain
              ? 'Fixed destination for this example'
              : `Where you want to receive LBTC (chains available for ${env})`}
          </p>
        </div>

        <div>
          <label
            htmlFor="destAddress"
            className="block text-sm font-medium mb-2"
          >
            Your Destination Address
          </label>
          <div className="relative">
            <input
              id="destAddress"
              type="text"
              value={destAddress}
              onChange={(e) => setDestAddress(e.target.value)}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green font-mono text-sm ${showWalletButton ? 'pr-10' : ''}`}
              placeholder={
                destChain.includes('solana')
                  ? 'Solana address...'
                  : destChain.includes('sui')
                    ? 'Sui address...'
                    : '0x...'
              }
              required
            />
            {showWalletButton && (
              <button
                type="button"
                onClick={() => {
                  void handleUseWalletAddress();
                }}
                title="Use wallet address"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-600 transition-colors"
              >
                <WalletIcon />
              </button>
            )}
          </div>
          <p className="text-xs text-secondary mt-1">
            {destChain.includes('solana')
              ? destAddress
                ? '✓ Using Solana wallet address'
                : 'Your Solana wallet address'
              : destChain.includes('sui')
                ? destAddress
                  ? '✓ Using Sui wallet address'
                  : 'Your Sui wallet address'
                : destAddress
                  ? '✓ Using EVM wallet address'
                  : `Your EVM wallet address on ${destChain}`}
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled || isLoading || isSubmitting || !isWalletConnected}
        className="btn btn-primary w-full mt-6"
      >
        {isLoading || isSubmitting ? (
          <>
            <span className="spinner" />
            Initializing...
          </>
        ) : !isWalletConnected ? (
          'Connect Wallet to Continue'
        ) : disabled ? (
          'Enter Partner ID to Continue'
        ) : (
          'Generate Deposit Address'
        )}
      </button>
    </form>
  );
}
