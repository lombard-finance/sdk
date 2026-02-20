import { AssetId, Chain } from '@lombard.finance/sdk';
import { useState } from 'react';

import type { UnstakingFormData } from '../lib/types';

interface StarknetUnstakingFormProps {
  onSubmit: (data: UnstakingFormData) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Starknet Unstaking Form Component
 *
 * Form for unstaking LBTC from Starknet → BTC
 */
export function StarknetUnstakingForm({
  onSubmit,
  isSubmitting,
}: StarknetUnstakingFormProps) {
  const [amount, setAmount] = useState('0.001');
  const [recipient, setRecipient] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await onSubmit({
      amount,
      recipient,
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTC,
      sourceChain: Chain.STARKNET_MAINNET,
      destChain: Chain.BITCOIN_MAINNET,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="amount"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          LBTC Amount
        </label>
        <input
          type="text"
          id="amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="0.001"
        />
        <p className="mt-1 text-xs text-gray-500">
          Amount of LBTC to unstake (e.g., 0.001)
        </p>
      </div>

      <div>
        <label
          htmlFor="recipient"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Bitcoin Recipient Address
        </label>
        <input
          type="text"
          id="recipient"
          value={recipient}
          onChange={e => setRecipient(e.target.value)}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
          placeholder="bc1q..."
        />
        <p className="mt-1 text-xs text-gray-500">
          Bitcoin address where you'll receive your BTC
        </p>
      </div>

      <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="mb-1 font-medium text-gray-700">Source Chain</div>
            <div className="text-gray-600">Starknet</div>
          </div>
          <div>
            <div className="mb-1 font-medium text-gray-700">
              Destination Chain
            </div>
            <div className="text-gray-600">Bitcoin</div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? 'Processing...' : 'Unstake LBTC'}
      </button>
    </form>
  );
}
