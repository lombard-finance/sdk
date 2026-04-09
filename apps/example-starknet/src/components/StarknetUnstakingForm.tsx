import {
  AssetId,
  Chain,
  Env,
  MIN_REDEEM_AMOUNT_BTC,
} from "@lombard.finance/sdk";
import { useState } from "react";

import type { UnstakingFormData } from "../lib/types";

interface StarknetUnstakingFormProps {
  onSubmit: (data: UnstakingFormData) => Promise<void>;
  isSubmitting: boolean;
  env: Env;
}

/**
 * Starknet Unstaking Form Component
 *
 * Form for unstaking LBTC from Starknet to BTC
 */
export function StarknetUnstakingForm({
  onSubmit,
  isSubmitting,
  env,
}: StarknetUnstakingFormProps) {
  const [amount, setAmount] = useState(String(MIN_REDEEM_AMOUNT_BTC));
  const [recipient, setRecipient] = useState("");

  const sourceChain =
    env === Env.prod ? Chain.STARKNET_MAINNET : Chain.STARKNET_SEPOLIA;
  const destChain =
    env === Env.prod ? Chain.BITCOIN_MAINNET : Chain.BITCOIN_SIGNET;

  const sourceLabel =
    env === Env.prod ? "Starknet Mainnet" : "Starknet Sepolia";
  const destLabel = env === Env.prod ? "Bitcoin Mainnet" : "Bitcoin Signet";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await onSubmit({
      amount,
      recipient,
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTC,
      sourceChain,
      destChain,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2 className="text-2xl font-semibold mb-6">Unstake LBTC</h2>

      <div className="space-y-4">
        {/* Source Chain (read-only) */}
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
            value={sourceLabel}
            disabled
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
          />
        </div>

        {/* Destination Chain (read-only) */}
        <div>
          <label htmlFor="destChain" className="block text-sm font-medium mb-2">
            Destination Chain
          </label>
          <input
            id="destChain"
            type="text"
            value={destLabel}
            disabled
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
          />
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium mb-2">
            Amount (LBTC)
          </label>
          <input
            type="text"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min={MIN_REDEEM_AMOUNT_BTC}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green"
            placeholder={String(MIN_REDEEM_AMOUNT_BTC)}
          />
          <p className="text-xs text-secondary mt-1">
            Minimum: {MIN_REDEEM_AMOUNT_BTC} LBTC
          </p>
        </div>

        {/* Recipient */}
        <div>
          <label htmlFor="recipient" className="block text-sm font-medium mb-2">
            Bitcoin Recipient Address
          </label>
          <input
            type="text"
            id="recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green font-mono text-sm"
            placeholder={env === Env.prod ? "bc1q..." : "tb1q..."}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn btn-primary w-full mt-6"
      >
        {isSubmitting ? (
          <>
            <span className="spinner" />
            Processing...
          </>
        ) : (
          "Unstake LBTC"
        )}
      </button>
    </form>
  );
}
