import { Chain, DeployProtocol, Env } from '@lombard.finance/sdk';
import { useState } from 'react';

import { useEvmWallet } from '../hooks/useEvmWallet';

interface StakeAndBakeFormProps {
  env: Env;
  onSubmit: (data: {
    amount: string;
    recipient: string;
    destChain: Chain;
    protocol: DeployProtocol;
    referralCode?: string;
  }) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
  onReset?: () => void;
}

/**
 * Form for configuring Stake-and-Bake parameters
 */
export function StakeAndBakeForm({
  env,
  onSubmit,
  isLoading,
  disabled = false,
  onReset,
}: StakeAndBakeFormProps) {
  const { address: evmAddress } = useEvmWallet();

  const [amount, setAmount] = useState('0.001');
  const [destAddress, setDestAddress] = useState('');
  const [protocol, setProtocol] = useState<DeployProtocol>(DeployProtocol.Veda);
  const [destChain, setDestChain] = useState<Chain>(
    env === Env.prod ? Chain.ETHEREUM : Chain.HOLESKY,
  );
  const [referralCode, setReferralCode] = useState('');

  // Auto-fill destination address if wallet connected
  const handleDestAddressFocus = () => {
    if (!destAddress && evmAddress) {
      setDestAddress(evmAddress);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await onSubmit({
      amount,
      recipient: destAddress,
      destChain,
      protocol,
      ...(referralCode && { referralCode }),
    });
  };

  // Get available chains based on protocol and env
  const getAvailableChains = () => {
    if (protocol === DeployProtocol.Veda) {
      if (env === Env.prod) {
        return [
          { value: Chain.ETHEREUM, label: 'Ethereum' },
          { value: Chain.BASE, label: 'Base' },
          { value: Chain.BSC, label: 'BNB Chain' },
          { value: Chain.CORN, label: 'Corn' },
        ];
      } else {
        return [
          { value: Chain.HOLESKY, label: 'Holesky' },
          { value: Chain.BASE_SEPOLIA, label: 'Base Sepolia' },
          { value: Chain.BSC_TESTNET, label: 'BNB Testnet' },
        ];
      }
    } else if (protocol === DeployProtocol.Silo) {
      return [{ value: Chain.AVALANCHE, label: 'Avalanche' }];
    }
    return [];
  };

  const availableChains = getAvailableChains();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-md border border-gray-300 bg-gray-50 p-4">
        <div className="mb-3 text-sm font-medium text-gray-700">
          What is Stake-and-Bake?
        </div>
        <p className="text-sm text-gray-600">
          Stake-and-Bake automatically stakes your BTC to LBTC and deposits it
          into a DeFi vault in a single atomic operation. This maximizes your
          yield by immediately putting your LBTC to work.
        </p>
      </div>

      <div>
        <label
          htmlFor="protocol"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Protocol <span className="text-red-500">*</span>
        </label>
        <select
          id="protocol"
          value={protocol}
          onChange={e => {
            const newProtocol = e.target.value as DeployProtocol;
            setProtocol(newProtocol);
            // Reset chain when protocol changes
            const chains = getAvailableChains();
            if (chains.length > 0) {
              setDestChain(chains[0].value);
            }
          }}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          disabled={isLoading || disabled}
        >
          <option value={DeployProtocol.Veda}>Lombard DeFi Vault (Veda)</option>
          <option value={DeployProtocol.Silo} disabled={env === Env.prod}>
            Silo Finance {env === Env.prod && '(Testnet only)'}
          </option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          {protocol === DeployProtocol.Veda
            ? "Lombard's native vault with optimized yields"
            : 'Third-party vault integration'}
        </p>
      </div>

      <div>
        <label
          htmlFor="destChain"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Destination Chain <span className="text-red-500">*</span>
        </label>
        <select
          id="destChain"
          value={destChain}
          onChange={e => setDestChain(e.target.value as Chain)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          disabled={isLoading || disabled}
        >
          {availableChains.map(chain => (
            <option key={chain.value} value={chain.value}>
              {chain.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Chain where LBTC will be minted and deposited to vault
        </p>
      </div>

      <div>
        <label
          htmlFor="amount"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          BTC Amount <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="0.001"
          disabled={isLoading || disabled}
        />
        <p className="mt-1 text-xs text-gray-500">
          Amount of BTC to stake (e.g., 0.001)
        </p>
      </div>

      <div>
        <label
          htmlFor="destAddress"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Recipient Address <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="destAddress"
          value={destAddress}
          onChange={e => setDestAddress(e.target.value)}
          onFocus={handleDestAddressFocus}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
          placeholder="0x..."
          disabled={isLoading || disabled}
        />
        <p className="mt-1 text-xs text-gray-500">
          {evmAddress
            ? 'Address auto-filled from connected wallet'
            : 'EVM address where vault shares will be minted'}
        </p>
      </div>

      <div>
        <label
          htmlFor="referralCode"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Referral Code <span className="text-gray-400">(Optional)</span>
        </label>
        <input
          type="text"
          id="referralCode"
          value={referralCode}
          onChange={e => setReferralCode(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="PARTNER123"
          disabled={isLoading || disabled}
        />
        <p className="mt-1 text-xs text-gray-500">
          Optional referral code for attribution
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isLoading || disabled}
          className="flex-1 rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : 'Stake and Bake'}
        </button>

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            disabled={isLoading}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
          </button>
        )}
      </div>
    </form>
  );
}
