import {
  AssetId,
  Chain,
  Env,
  MIN_REDEEM_AMOUNT_BTC,
} from '@lombard.finance/sdk';
import { useState } from 'react';

import type { WithdrawFormData } from '../lib/types';

interface SuiWithdrawingFormProps {
  onSubmit: (data: WithdrawFormData) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
  env: Env;
  suiAddress?: string | null;
}

/**
 * Get Sui source chain based on environment
 */
function getSuiChain(env: Env): Chain {
  return env === Env.prod ? Chain.SUI_MAINNET : Chain.SUI_TESTNET;
}

/**
 * Get Bitcoin destination chain based on environment
 */
function getBtcChain(env: Env): Chain {
  return env === Env.prod ? Chain.BITCOIN_MAINNET : Chain.BITCOIN_SIGNET;
}

/**
 * Form for configuring Sui unstaking parameters
 */
export function SuiWithdrawingForm({
  onSubmit,
  isLoading,
  disabled = false,
  env,
  suiAddress,
}: SuiWithdrawingFormProps) {
  const [amount, setAmount] = useState(String(MIN_REDEEM_AMOUNT_BTC));
  const [recipient, setRecipient] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sourceChain = getSuiChain(env);
  const destChain = getBtcChain(env);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipient) {
      alert('Please enter your Bitcoin address');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        amount,
        assetIn: AssetId.LBTC,
        assetOut: AssetId.BTC,
        sourceChain,
        destChain,
        recipient,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2 className="text-2xl font-semibold mb-6">Unstake LBTC from Sui</h2>

      <div className="space-y-4">
        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium mb-2">
            Amount (LBTC)
          </label>
          <input
            id="amount"
            type="number"
            step="0.00000001"
            min={MIN_REDEEM_AMOUNT_BTC}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green"
            placeholder={String(MIN_REDEEM_AMOUNT_BTC)}
            required
          />
          <p className="text-xs text-secondary mt-1">
            Minimum: {MIN_REDEEM_AMOUNT_BTC} LBTC
          </p>
        </div>

        {/* Source Chain (Read-only) */}
        <div>
          <label
            htmlFor="sourceChain"
            className="block text-sm font-medium mb-2"
          >
            Source Chain
          </label>
          <input
            id="sourceChain"
            type="text"
            value={env === Env.prod ? 'Sui Mainnet' : 'Sui Testnet'}
            disabled
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
          />
          <p className="text-xs text-secondary mt-1">
            Where LBTC will be burned
          </p>
        </div>

        {/* Destination Chain (Read-only) */}
        <div>
          <label htmlFor="destChain" className="block text-sm font-medium mb-2">
            Destination Chain
          </label>
          <input
            id="destChain"
            type="text"
            value={env === Env.prod ? 'Bitcoin Mainnet' : 'Bitcoin Signet'}
            disabled
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
          />
          <p className="text-xs text-secondary mt-1">
            Where BTC will be released
          </p>
        </div>

        {/* Bitcoin Recipient Address */}
        <div>
          <label htmlFor="recipient" className="block text-sm font-medium mb-2">
            Bitcoin Recipient Address
          </label>
          <input
            id="recipient"
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green font-mono text-sm"
            placeholder={env === Env.prod ? 'bc1q...' : 'tb1q...'}
            required
          />
          <p className="text-xs text-secondary mt-1">
            {env === Env.prod
              ? 'Your Bitcoin mainnet address (bc1q...)'
              : 'Your Bitcoin testnet address (tb1q...)'}
          </p>
        </div>

        {/* Connected Sui Address Info */}
        {suiAddress && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-900">
              ✓ Sui wallet connected:{' '}
              <code className="font-mono">
                {suiAddress.slice(0, 8)}...{suiAddress.slice(-6)}
              </code>
            </p>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={disabled || isLoading || isSubmitting}
        className="btn btn-primary w-full mt-6"
      >
        {isLoading || isSubmitting ? (
          <>
            <span className="spinner" />
            Processing...
          </>
        ) : !suiAddress ? (
          'Connect Sui Wallet to Continue'
        ) : (
          'Burn LBTC'
        )}
      </button>
    </form>
  );
}
