import { useCallback, useState } from 'react';

import { useSolanaWallet } from '../hooks/useSolanaWallet';

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4.667 4.667V4c0-.934 0-1.4.181-1.757a1.667 1.667 0 0 1 .729-.728C5.933 1.333 6.4 1.333 7.333 1.333H12c.934 0 1.4 0 1.757.182.313.16.569.415.728.728.182.357.182.823.182 1.757v4.667c0 .933 0 1.4-.182 1.756-.16.314-.415.569-.728.729-.357.181-.823.181-1.757.181h-.667M11.333 7.333V12c0 .933 0 1.4-.181 1.757a1.667 1.667 0 0 1-.729.728c-.356.182-.823.182-1.756.182H4c-.933 0-1.4 0-1.757-.182a1.667 1.667 0 0 1-.728-.728C1.333 13.4 1.333 12.933 1.333 12V7.333c0-.933 0-1.4.182-1.756.16-.314.415-.569.728-.729.357-.181.824-.181 1.757-.181h4.667c.933 0 1.4 0 1.756.181.314.16.569.415.729.729.181.356.181.823.181 1.756Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13.333 4 6 11.333 2.667 8"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Solana Wallet Connection Component
 *
 * Provides UI for connecting/disconnecting Solana wallet (Phantom)
 */
export function SolanaWalletConnect() {
  const { address, isConnecting, error, connect, disconnect, isConnected } =
    useSolanaWallet();
  const [copied, setCopied] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleCopy = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [address]);

  const handleConnect = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="card">
      <h3 className="font-semibold mb-3">Solana Wallet</h3>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-900">{error}</p>
          {error.includes('not detected') && (
            <a
              href="https://phantom.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline mt-2 inline-block"
            >
              Install Phantom Wallet →
            </a>
          )}
        </div>
      )}

      {isConnected && address ? (
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-4">
            <p className="text-sm text-secondary mb-1">Connected Address</p>
            <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-lg">
              <code className="text-sm font-mono">
                {formatAddress(address)}
              </code>
              <button
                type="button"
                onClick={() => { void handleCopy(); }}
                title={copied ? 'Copied!' : 'Copy address'}
                className={`p-1 rounded transition-colors ${
                  copied
                    ? 'text-green-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </button>
            </div>
          </div>
          <button
            onClick={handleConnect}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors text-sm"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full px-4 py-2 bg-capital-green hover:bg-emerald-700 text-white rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isConnecting ? 'Connecting...' : 'Connect Phantom Wallet'}
        </button>
      )}

      {!isConnected && (
        <p className="text-xs text-secondary mt-2">
          Connect your Phantom or other Solana wallet to burn LBTC
        </p>
      )}
    </div>
  );
}
