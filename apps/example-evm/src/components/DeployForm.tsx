import {
  Chain,
  DeployProtocol,
  MIN_STAKE_AMOUNT_BTC,
} from '@lombard.finance/sdk';
import { useCallback, useState } from 'react';

function WalletIcon() {
  return (
    <svg
      width="16"
      height="14"
      viewBox="0 0 16 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0.75 0H14.25H15V1.5H14.25H1.5V12.5H14.5V4.5H3.75H3V3H3.75H15.25H16V3.75V13.25V14H15.25H0.75H0V13.25V0.75V0H0.75ZM12 9.5C11.4375 9.5 11 9.0625 11 8.5C11 7.96875 11.4375 7.5 12 7.5C12.5312 7.5 13 7.96875 13 8.5C13 9.0625 12.5312 9.5 12 9.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

interface StakeAndDeployFormProps {
  onSubmit: (data: {
    amount: string;
    recipient: string;
    destChain: Chain;
    protocol: DeployProtocol;
    referralCode?: string;
  }) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
  isWalletConnected?: boolean;
}

/**
 * Form for configuring Stake-and-Deploy parameters
 */
export function DeployForm({
  onSubmit,
  isLoading,
  disabled = false,
  isWalletConnected = true,
}: StakeAndDeployFormProps) {
  const [amount, setAmount] = useState(String(MIN_STAKE_AMOUNT_BTC));
  const [destAddress, setDestAddress] = useState('');
  const [protocol, setProtocol] = useState<DeployProtocol>(
    DeployProtocol.BitcoinEarn,
  );
  // Stake-and-Deploy only supports Ethereum mainnet
  const [destChain, setDestChain] = useState<Chain>(Chain.ETHEREUM);
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

  // Stake-and-Deploy only supports Ethereum mainnet
  const availableChains = [{ value: Chain.ETHEREUM, label: 'Ethereum' }];

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2 className="text-2xl font-semibold mb-6">Stake and Deploy</h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="protocol" className="block text-sm font-medium mb-2">
            Protocol
          </label>
          <select
            id="protocol"
            value={protocol}
            onChange={(e) => {
              const newProtocol = e.target.value as DeployProtocol;
              setProtocol(newProtocol);
              if (availableChains.length > 0) {
                setDestChain(availableChains[0].value);
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green"
            disabled={isLoading || disabled}
          >
            <option value={DeployProtocol.BitcoinEarn}>Bitcoin Earn</option>
          </select>
          <p className="text-xs text-secondary mt-1">
            Lombard&apos;s native vault with optimized yields
          </p>
        </div>

        <div>
          <label htmlFor="destChain" className="block text-sm font-medium mb-2">
            Destination Chain
          </label>
          <select
            id="destChain"
            value={destChain}
            onChange={(e) => setDestChain(e.target.value as Chain)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green"
            disabled={isLoading || disabled}
          >
            {availableChains.map((chain) => (
              <option key={chain.value} value={chain.value}>
                {chain.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-secondary mt-1">
            Chain where LBTC will be minted and deposited to vault
          </p>
        </div>

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
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green"
            placeholder={String(MIN_STAKE_AMOUNT_BTC)}
            required
            disabled={isLoading || disabled}
          />
          <p className="text-xs text-secondary mt-1">
            Minimum: {MIN_STAKE_AMOUNT_BTC} BTC
          </p>
        </div>

        <div>
          <label
            htmlFor="destAddress"
            className="block text-sm font-medium mb-2"
          >
            Recipient Address
          </label>
          <div className="relative">
            <input
              id="destAddress"
              type="text"
              value={destAddress}
              onChange={(e) => setDestAddress(e.target.value)}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green font-mono text-sm ${hasEthereum ? 'pr-10' : ''}`}
              placeholder="0x..."
              required
              disabled={isLoading || disabled}
            />
            {hasEthereum && (
              <button
                type="button"
                onClick={() => {
                  void handleUseWalletAddress();
                }}
                title="Use wallet address"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-600 transition-colors"
              >
                <WalletIcon />
              </button>
            )}
          </div>
          <p className="text-xs text-secondary mt-1">
            EVM address where vault shares will be minted
          </p>
        </div>

        <div>
          <label
            htmlFor="referralCode"
            className="block text-sm font-medium mb-2"
          >
            Referral Code (Optional)
          </label>
          <input
            id="referralCode"
            type="text"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-capital-green"
            placeholder="PARTNER123"
            disabled={isLoading || disabled}
          />
          <p className="text-xs text-secondary mt-1">
            Optional referral code for attribution
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled || isLoading || !isWalletConnected}
        className="btn btn-primary w-full mt-6"
      >
        {isLoading ? (
          <>
            <span className="spinner" />
            Processing...
          </>
        ) : !isWalletConnected ? (
          'Connect Wallet to Continue'
        ) : disabled ? (
          'Enter Partner ID to Continue'
        ) : (
          'Stake and Deploy'
        )}
      </button>
    </form>
  );
}
