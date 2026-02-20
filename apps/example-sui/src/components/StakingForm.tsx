import { AssetId, Chain, Env } from '@lombard.finance/sdk';
import { useEffect, useState } from 'react';

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
 * Form for configuring staking parameters (Sui destination)
 */
export function StakingForm({
  env,
  onSubmit,
  isLoading,
  disabled = false,
  solanaAddress: suiAddress,
  fixedDestChain,
}: StakingFormProps) {
  const availableChains = getAvailableChains(env);

  const [amount, setAmount] = useState('0.001');
  const [destChain, setDestChain] = useState(
    fixedDestChain ?? getDefaultChain(env),
  );
  const [destAddress, setDestAddress] = useState('');

  // Update destination chain when environment changes (only if not fixed)
  useEffect(() => {
    if (!fixedDestChain) {
      setDestChain(getDefaultChain(env));
    }
  }, [env, fixedDestChain]);

  // Auto-fill destination address from connected Sui wallet
  useEffect(() => {
    if (suiAddress && !destAddress) {
      setDestAddress(suiAddress);
    }
  }, [suiAddress, destAddress]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
            min="0.0001"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green"
            placeholder="0.001"
            required
          />
          <p className="text-xs text-secondary mt-1">Minimum: 0.0001 BTC</p>
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
          <label
            htmlFor="destAddress"
            className="block text-sm font-medium mb-2"
          >
            Your Sui Destination Address
          </label>
          <input
            id="destAddress"
            type="text"
            value={destAddress}
            onChange={e => setDestAddress(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green font-mono text-sm"
            placeholder="0x..."
            required
          />
          <p className="text-xs text-secondary mt-1">
            {suiAddress === destAddress && destAddress
              ? '✓ Auto-filled from connected Sui wallet'
              : 'Your Sui wallet address'}
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
