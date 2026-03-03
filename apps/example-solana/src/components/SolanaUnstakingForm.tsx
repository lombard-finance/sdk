import { AssetId, Chain, Env, MIN_REDEEM_AMOUNT_BTC } from '@lombard.finance/sdk';
import { FormEvent, useEffect, useState } from 'react';

import type { SolanaUnstakingFormData } from '../pages/SolanaUnstakePage/useSolanaUnstaking';

interface SolanaUnstakingFormProps {
  onSubmit: (formData: SolanaUnstakingFormData) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
  env: Env;
}

/**
 * Get available Solana source chains based on environment
 */
function getSolanaChain(env: Env): Chain {
  switch (env) {
    case Env.prod:
      return Chain.SOLANA_MAINNET;
    case Env.testnet:
    case Env.stage:
    default:
      return Chain.SOLANA_DEVNET;
  }
}

/**
 * Get Bitcoin destination chain based on environment
 */
function getBitcoinChain(env: Env): Chain {
  switch (env) {
    case Env.prod:
      return Chain.BITCOIN_MAINNET;
    case Env.testnet:
    case Env.stage:
    default:
      return Chain.BITCOIN_SIGNET;
  }
}

/**
 * Solana Unstaking Form Component
 *
 * Form for configuring LBTC unstaking on Solana
 */
export function SolanaUnstakingForm({
  onSubmit,
  isLoading,
  disabled = false,
  env,
}: SolanaUnstakingFormProps) {
  const sourceChain = getSolanaChain(env);
  const destChain = getBitcoinChain(env);
  const assetOut = AssetId.BTC; // Solana only supports unstaking to BTC

  const [amount, setAmount] = useState(String(MIN_REDEEM_AMOUNT_BTC));
  const [recipient, setRecipient] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset recipient when env changes
  useEffect(() => {
    setRecipient('');
  }, [env]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!recipient) {
      alert('Please enter Bitcoin recipient address');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        amount,
        sourceChain,
        destChain,
        recipient,
        assetOut,
      });
    } catch (err) {
      console.error('Form submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getChainLabel = (chain: Chain): string => {
    switch (chain) {
      case Chain.SOLANA_MAINNET:
        return 'Solana Mainnet';
      case Chain.SOLANA_DEVNET:
        return 'Solana Devnet';
      case Chain.BITCOIN_MAINNET:
        return 'Bitcoin Mainnet';
      case Chain.BITCOIN_SIGNET:
        return 'Bitcoin Signet (Testnet)';
      default:
        return chain;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2 className="text-2xl font-semibold mb-6">Unstake LBTC from Solana</h2>

      <div className="space-y-4">
        {/* Source Chain (read-only) */}
        <div>
          <label htmlFor="sourceChain" className="block text-sm font-medium mb-2">
            Source Chain
          </label>
          <input
            id="sourceChain"
            type="text"
            value={getChainLabel(sourceChain)}
            disabled
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
          />
          <p className="text-xs text-secondary mt-1">
            LBTC will be burned on this chain
          </p>
        </div>

        {/* Destination Chain (read-only) */}
        <div>
          <label htmlFor="destChain" className="block text-sm font-medium mb-2">
            Destination Chain
          </label>
          <input
            id="destChain"
            type="text"
            value={getChainLabel(destChain)}
            disabled
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
          />
          <p className="text-xs text-secondary mt-1">
            BTC will be released on Bitcoin network
          </p>
        </div>

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
            onChange={e => setAmount(e.target.value)}
            disabled={isSubmitting || disabled || isLoading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green"
            placeholder={String(MIN_REDEEM_AMOUNT_BTC)}
            required
          />
          <p className="text-xs text-secondary mt-1">
            Minimum: {MIN_REDEEM_AMOUNT_BTC} LBTC
          </p>
        </div>

        {/* Recipient (Bitcoin Address) */}
        <div>
          <label htmlFor="recipient" className="block text-sm font-medium mb-2">
            Bitcoin Recipient Address
          </label>
          <input
            id="recipient"
            type="text"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            placeholder={env === Env.prod ? 'bc1q...' : 'tb1q...'}
            disabled={isSubmitting || disabled || isLoading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green font-mono text-sm"
            required
          />
          <p className="text-xs text-secondary mt-1">
            Bitcoin address to receive BTC
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || disabled || isLoading}
        className="btn btn-primary w-full mt-6"
      >
        {isSubmitting ? (
          <>
            <span className="spinner" />
            Processing...
          </>
        ) : (
          'Start Unstake'
        )}
      </button>
    </form>
  );
}
