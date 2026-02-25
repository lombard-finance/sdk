import { AssetId, Chain, Env, MIN_STAKE_AMOUNT_BTC } from '@lombard.finance/sdk';
import { useEffect, useState } from 'react';

import { useEvmWallet } from '../hooks/useEvmWallet';
import { getAvailableChains, getDefaultChain } from '../lib/chains';
import type { StakingFormData } from '../lib/types';

interface StakingFormProps {
  env: Env;
  onSubmit: (data: StakingFormData) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
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
  solanaAddress,
  fixedDestChain,
}: StakingFormProps) {
  const availableChains = getAvailableChains(env);

  const [amount, setAmount] = useState(String(MIN_STAKE_AMOUNT_BTC));
  const [destChain, setDestChain] = useState(
    fixedDestChain ?? getDefaultChain(env),
  );
  const [destAddress, setDestAddress] = useState('');
  const { address: evmAddress, isConnected: isEvmConnected } = useEvmWallet();

  // Update destination chain when environment or fixedDestChain changes
  useEffect(() => {
    setDestChain(fixedDestChain ?? getDefaultChain(env));
  }, [env, fixedDestChain]);

  // Auto-fill destination address based on chain type
  useEffect(() => {
    // For Solana chains, use Solana address
    if (solanaAddress && !destAddress && destChain.includes('solana')) {
      setDestAddress(solanaAddress);
    }
    // For Sui chains, use Sui address (passed via solanaAddress prop)
    else if (solanaAddress && !destAddress && destChain.includes('sui')) {
      setDestAddress(solanaAddress);
    }
    // For EVM chains, use EVM address
    else if (
      isEvmConnected &&
      evmAddress &&
      !destAddress &&
      !destChain.includes('solana') &&
      !destChain.includes('sui')
    ) {
      setDestAddress(evmAddress);
    }
  }, [isEvmConnected, evmAddress, solanaAddress, destAddress, destChain]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeWalletAddress =
    destChain.includes('solana') || destChain.includes('sui')
      ? solanaAddress
      : isEvmConnected
        ? evmAddress
        : null;

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
            onChange={e => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green"
            placeholder={String(MIN_STAKE_AMOUNT_BTC)}
            required
          />
          <p className="text-xs text-secondary mt-1">Minimum: {MIN_STAKE_AMOUNT_BTC} BTC</p>
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
                availableChains.find(c => c.value === destChain)?.label ??
                destChain
              }
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
            />
          ) : (
            <select
              id="destChain"
              value={destChain}
              onChange={e => setDestChain(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green"
            >
              {availableChains.map(chain => (
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
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="destAddress" className="block text-sm font-medium">
              Your Destination Address
            </label>
            {activeWalletAddress && (
              <button
                type="button"
                onClick={() => setDestAddress(activeWalletAddress)}
                className="text-xs text-capital-green hover:underline font-medium"
              >
                Use wallet address
              </button>
            )}
          </div>
          <input
            id="destAddress"
            type="text"
            value={destAddress}
            onChange={e => setDestAddress(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green font-mono text-sm"
            placeholder={
              destChain.includes('solana')
                ? 'Solana address...'
                : destChain.includes('sui')
                  ? 'Sui address...'
                  : '0x...'
            }
            required
          />
          <p className="text-xs text-secondary mt-1">
            {isEvmConnected &&
              evmAddress === destAddress &&
              '✓ Auto-filled from connected EVM wallet'}
            {solanaAddress === destAddress &&
              destChain.includes('solana') &&
              '✓ Auto-filled from connected Solana wallet'}
            {solanaAddress === destAddress &&
              destChain.includes('sui') &&
              '✓ Auto-filled from connected Sui wallet'}
            {!destAddress &&
              (destChain.includes('solana')
                ? 'Your Solana wallet address'
                : destChain.includes('sui')
                  ? 'Your Sui wallet address'
                  : `Your EVM wallet address on ${destChain}`)}
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled || isLoading || isSubmitting}
        className="btn btn-primary w-full mt-6"
      >
        {isLoading || isSubmitting ? (
          <>
            <span className="spinner" />
            Initializing...
          </>
        ) : disabled ? (
          'Enter Partner ID to Continue'
        ) : (
          'Generate Deposit Address'
        )}
      </button>
    </form>
  );
}
