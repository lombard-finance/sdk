import { AssetId, Chain, Env } from '@lombard.finance/sdk';
import { useCallback, useEffect, useState } from 'react';

import { getAvailableChains, getBtcbUnstakeChains } from '../lib/chains';
import type { UnstakingFormData } from '../pages/UnstakePage/useEvmUnstaking';

const MIN_REDEEM_BTC = 0.000133;
const MIN_REDEEM_BTCB = 0.00011;

function WalletIcon() {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0.75 0H14.25H15V1.5H14.25H1.5V12.5H14.5V4.5H3.75H3V3H3.75H15.25H16V3.75V13.25V14H15.25H0.75H0V13.25V0.75V0H0.75ZM12 9.5C11.4375 9.5 11 9.0625 11 8.5C11 7.96875 11.4375 7.5 12 7.5C12.5312 7.5 13 7.96875 13 8.5C13 9.0625 12.5312 9.5 12 9.5Z" fill="currentColor" />
    </svg>
  );
}

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
  const [assetOut, setAssetOut] = useState<AssetId>(AssetId.BTC);

  const isBtcOutput = assetOut === AssetId.BTC;
  const minAmount = isBtcOutput ? MIN_REDEEM_BTC : MIN_REDEEM_BTCB;
  const availableChains = isBtcOutput
    ? getAvailableChains(env)
    : getBtcbUnstakeChains(env);
  const defaultChain = availableChains[0]?.value || Chain.ETHEREUM;

  const [amount, setAmount] = useState(String(minAmount));
  const [sourceChain, setSourceChain] = useState(defaultChain);
  const [destChain, setDestChain] = useState(
    env === Env.prod ? Chain.BITCOIN_MAINNET : Chain.BITCOIN_SIGNET,
  );
  const [recipient, setRecipient] = useState('');

  const hasEthereum =
    typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';

  const handleUseWalletAddress = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      const accounts = (await window.ethereum.request({
        method: 'eth_accounts',
      })) as string[];
      if (accounts.length > 0) {
        setRecipient(accounts[0]);
      }
    } catch {
      // Could not fetch wallet address
    }
  }, []);

  // Update chains when environment or asset changes
  useEffect(() => {
    const chains = isBtcOutput
      ? getAvailableChains(env)
      : getBtcbUnstakeChains(env);
    if (chains.length > 0) {
      setSourceChain(chains[0].value);
    }
    if (isBtcOutput) {
      setDestChain(
        env === Env.prod ? Chain.BITCOIN_MAINNET : Chain.BITCOIN_SIGNET,
      );
    }
    setAmount(String(isBtcOutput ? MIN_REDEEM_BTC : MIN_REDEEM_BTCB));
  }, [env, isBtcOutput]);

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
            min={minAmount}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green"
            placeholder={String(minAmount)}
            required
          />
          <p className="text-xs text-secondary mt-1">
            Minimum: {minAmount} LBTC {isBtcOutput ? '(→ BTC)' : '(→ BTC.b)'}
          </p>
        </div>

        {/* Recipient Address */}
        <div>
          <label htmlFor="recipient" className="block text-sm font-medium mb-2">
            Recipient Address
          </label>
          <div className="relative">
            <input
              id="recipient"
              type="text"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green font-mono text-sm ${!isBtcOutput && hasEthereum ? 'pr-10' : ''}`}
              placeholder={
                isBtcOutput
                  ? env === Env.prod
                    ? 'bc1q... (Bitcoin address)'
                    : 'tb1q... (Bitcoin testnet address)'
                  : '0x... (EVM address)'
              }
              required
            />
            {!isBtcOutput && hasEthereum && (
              <button
                type="button"
                onClick={() => { void handleUseWalletAddress(); }}
                title="Use wallet address"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-600 transition-colors"
              >
                <WalletIcon />
              </button>
            )}
          </div>
          <p className="text-xs text-secondary mt-1">
            {isBtcOutput
              ? 'Bitcoin address where BTC will be sent'
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
