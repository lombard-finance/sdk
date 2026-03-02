import { Chain, DeployProtocol, Env, MIN_STAKE_AMOUNT_BTC } from '@lombard.finance/sdk';
import { useCallback, useState } from 'react';

function WalletIcon() {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0.75 0H14.25H15V1.5H14.25H1.5V12.5H14.5V4.5H3.75H3V3H3.75H15.25H16V3.75V13.25V14H15.25H0.75H0V13.25V0.75V0H0.75ZM12 9.5C11.4375 9.5 11 9.0625 11 8.5C11 7.96875 11.4375 7.5 12 7.5C12.5312 7.5 13 7.96875 13 8.5C13 9.0625 12.5312 9.5 12 9.5Z" fill="currentColor" />
    </svg>
  );
}

interface StakeAndDeployFormProps {
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
 * Form for configuring Stake-and-Deploy parameters
 */
export function StakeAndDeployForm({
  env,
  onSubmit,
  isLoading,
  disabled = false,
  onReset,
}: StakeAndDeployFormProps) {
  const [amount, setAmount] = useState(String(MIN_STAKE_AMOUNT_BTC));
  const [destAddress, setDestAddress] = useState('');
  const [protocol, setProtocol] = useState<DeployProtocol>(DeployProtocol.Veda);
  const [destChain, setDestChain] = useState<Chain>(
    env === Env.prod ? Chain.ETHEREUM : Chain.HOLESKY,
  );
  const [referralCode, setReferralCode] = useState('');

  const hasEthereum =
    typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';

  const handleUseWalletAddress = useCallback(async () => {
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
  }, []);

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
          What is Stake-and-Deploy?
        </div>
        <p className="text-sm text-gray-600">
          Stake-and-Deploy automatically stakes your BTC to LBTC and deposits it
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
        <p className="mt-1 text-xs text-gray-500">Minimum: {MIN_STAKE_AMOUNT_BTC} BTC</p>
      </div>

      <div>
        <label
          htmlFor="destAddress"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Recipient Address <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            id="destAddress"
            value={destAddress}
            onChange={e => setDestAddress(e.target.value)}
            required
            className={`w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm ${hasEthereum ? 'pr-10' : ''}`}
            placeholder="0x..."
            disabled={isLoading || disabled}
          />
          {hasEthereum && (
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
        <p className="mt-1 text-xs text-gray-500">
          EVM address where vault shares will be minted
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
          {isLoading ? 'Processing...' : 'Stake and Deploy'}
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
