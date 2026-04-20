import { useCallback, useState } from 'react';

import { useEvmWallet } from '../hooks/useEvmWallet';

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
 * EVM Wallet connection component
 */
export function WalletConnect() {
  const { address, isConnected, isConnecting, error, connect, disconnect } =
    useEvmWallet();
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

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold mb-1">EVM Wallet</h3>
          <p className="text-sm text-secondary">
            {isConnected
              ? 'Wallet connected'
              : 'Connect wallet for enhanced features'}
          </p>
        </div>

        {isConnected ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-lg">
              <code className="text-sm font-mono">
                {formatAddress(address!)}
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
            <button onClick={disconnect} className="btn btn-secondary">
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={connect}
            disabled={isConnecting}
            className="btn btn-primary"
          >
            {isConnecting ? (
              <>
                <span className="spinner" />
                Connecting...
              </>
            ) : (
              'Connect Wallet'
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {!isConnected && typeof window !== 'undefined' && !window.ethereum && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>No wallet detected.</strong> Install{' '}
            <a
              href="https://metamask.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              MetaMask
            </a>{' '}
            or another web3 wallet.
          </p>
        </div>
      )}
    </div>
  );
}
