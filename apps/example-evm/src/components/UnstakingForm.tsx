import { AssetId, Chain, Env, MIN_REDEEM_AMOUNT_BTC } from '@lombard.finance/sdk';
import { useEffect, useState } from 'react';

import { useEvmWallet } from '../hooks/useEvmWallet';
import { getAvailableChains } from '../lib/chains';
import type { UnstakingFormData } from '../pages/UnstakePage/useEvmUnstaking';

interface UnstakingFormProps {
  env: Env;
  onSubmit: (data: UnstakingFormData) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
}

/**
 * Form for configuring unstaking parameters
 *
 * Supports:
 * - BTC output: LBTC -> BTC (cross-chain to Bitcoin)
 * - BTCb output: LBTC -> BTC.b (same-chain unwrap)
 */
export function UnstakingForm({
  env,
  onSubmit,
  isLoading,
  disabled = false,
}: UnstakingFormProps) {
  const availableChains = getAvailableChains(env);
  const defaultChain = availableChains[0]?.value || Chain.ETHEREUM;

  const [amount, setAmount] = useState(String(MIN_REDEEM_AMOUNT_BTC));
  const [assetOut, setAssetOut] = useState<AssetId>(AssetId.BTC);
  const [sourceChain, setSourceChain] = useState(defaultChain);
  const [destChain, setDestChain] = useState(
    env === Env.prod ? Chain.BITCOIN_MAINNET : Chain.BITCOIN_SIGNET,
  );
  const [recipient, setRecipient] = useState('');
  const { address: walletAddress, isConnected } = useEvmWallet();

  // Update chains when environment changes
  useEffect(() => {
    const chains = getAvailableChains(env);
    if (chains.length > 0) {
      setSourceChain(chains[0].value);
    }
    setDestChain(
      env === Env.prod ? Chain.BITCOIN_MAINNET : Chain.BITCOIN_SIGNET,
    );
  }, [env]);

  // Auto-fill recipient for BTCb output
  useEffect(() => {
    if (
      assetOut === AssetId.BTCb &&
      isConnected &&
      walletAddress &&
      !recipient
    ) {
      setRecipient(walletAddress);
    }
  }, [assetOut, isConnected, walletAddress, recipient]);

  // Update destChain based on assetOut
  useEffect(() => {
    if (assetOut === AssetId.BTCb) {
      // For BTCb, destination is same as source
      setDestChain(sourceChain);
    } else {
      // For BTC, destination is Bitcoin network
      setDestChain(
        env === Env.prod ? Chain.BITCOIN_MAINNET : Chain.BITCOIN_SIGNET,
      );
    }
  }, [assetOut, sourceChain, env]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        amount,
        sourceChain,
        destChain,
        recipient,
        assetOut,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBtcOutput = assetOut === AssetId.BTC;

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2 className="text-2xl font-semibold mb-6">Unstake LBTC</h2>

      <div className="space-y-4">
        {/* Output Asset Selection */}
        <div>
          <label htmlFor="assetOut" className="block text-sm font-medium mb-2">
            Output Asset
          </label>
          <select
            id="assetOut"
            value={assetOut}
            onChange={e => setAssetOut(e.target.value as AssetId)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green"
          >
            <option value={AssetId.BTC}>BTC (Cross-chain to Bitcoin)</option>
            <option value={AssetId.BTCb}>BTC.b (Same chain)</option>
          </select>
          <p className="text-xs text-secondary mt-1">
            {isBtcOutput
              ? 'Receive native BTC on Bitcoin network'
              : 'Receive wrapped BTC.b on same EVM chain'}
          </p>
        </div>

        {/* Source Chain */}
        <div>
          <label
            htmlFor="sourceChain"
            className="block text-sm font-medium mb-2"
          >
            Source Chain
          </label>
          <select
            id="sourceChain"
            value={sourceChain}
            onChange={e => setSourceChain(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green"
          >
            {availableChains.map(chain => (
              <option key={chain.value} value={chain.value}>
                {chain.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-secondary mt-1">
            EVM chain where LBTC will be burned
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green"
            placeholder={String(MIN_REDEEM_AMOUNT_BTC)}
            required
          />
          <p className="text-xs text-secondary mt-1">Minimum: {MIN_REDEEM_AMOUNT_BTC} LBTC</p>
        </div>

        {/* Recipient Address */}
        <div>
          <label htmlFor="recipient" className="block text-sm font-medium mb-2">
            Recipient Address
          </label>
          <input
            id="recipient"
            type="text"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green font-mono text-sm"
            placeholder={
              isBtcOutput
                ? env === Env.prod
                  ? 'bc1q... (Bitcoin address)'
                  : 'tb1q... (Bitcoin testnet address)'
                : '0x... (EVM address)'
            }
            required
          />
          <p className="text-xs text-secondary mt-1">
            {isBtcOutput
              ? 'Bitcoin address where BTC will be sent'
              : isConnected
                ? '✓ Auto-filled from connected wallet'
                : `EVM address on ${sourceChain}`}
          </p>
        </div>

        {/* Destination Chain Info (for BTC output) */}
        {isBtcOutput && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm">
              <strong>Destination:</strong>{' '}
              {destChain === Chain.BITCOIN_MAINNET
                ? 'Bitcoin Mainnet'
                : 'Bitcoin Signet'}
            </p>
            <p className="text-xs text-secondary mt-1">
              BTC will be released on the Bitcoin network
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
        ) : disabled ? (
          'Connect Wallet to Continue'
        ) : (
          'Start Unstake'
        )}
      </button>
    </form>
  );
}
