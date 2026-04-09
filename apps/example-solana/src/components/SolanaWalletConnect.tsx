import { useCallback, useState } from "react";

import { useSolanaWallet } from "../hooks/useSolanaWallet";

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.667 4.667V4c0-.934 0-1.4.181-1.757a1.667 1.667 0 0 1 .729-.728C5.933 1.333 6.4 1.333 7.333 1.333H12c.934 0 1.4 0 1.757.182.313.16.569.415.728.728.182.357.182.823.182 1.757v4.667c0 .933 0 1.4-.182 1.756-.16.314-.415.569-.728.729-.357.181-.823.181-1.757.181h-.667M11.333 7.333V12c0 .933 0 1.4-.181 1.757a1.667 1.667 0 0 1-.729.728c-.356.182-.823.182-1.756.182H4c-.933 0-1.4 0-1.757-.182a1.667 1.667 0 0 1-.728-.728C1.333 13.4 1.333 12.933 1.333 12V7.333c0-.933 0-1.4.182-1.756.16-.314.415-.569.728-.729.357-.181.824-.181 1.757-.181h4.667c.933 0 1.4 0 1.756.181.314.16.569.415.729.729.181.356.181.823.181 1.756Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.333 4 6 11.333 2.667 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
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

  const isPhantomAvailable = typeof window !== "undefined" && !!window.solana;

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
      console.error("Failed to copy:", err);
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

      {error && !error.includes("not detected") && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-900">{error}</p>
        </div>
      )}

      {!isPhantomAvailable && !isConnected ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-medium text-amber-900 mb-2">
            Phantom wallet not detected
          </p>
          <p className="text-xs text-amber-800 mb-3">
            This example requires Phantom wallet for Solana interactions.
          </p>
          <a
            href="https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Install Phantom for Chrome
          </a>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-secondary">
              {isConnected
                ? "Phantom wallet connected"
                : "Connect Phantom wallet"}
            </p>
          </div>

          {isConnected && address ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-lg">
                <code className="text-sm font-mono">
                  {formatAddress(address)}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    void handleCopy();
                  }}
                  title={copied ? "Copied!" : "Copy address"}
                  className={`p-1 rounded transition-colors ${
                    copied
                      ? "text-green-600"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </button>
              </div>
              <button onClick={handleConnect} className="btn btn-secondary">
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="btn btn-primary"
            >
              {isConnecting ? (
                <>
                  <span className="spinner" />
                  Connecting...
                </>
              ) : (
                "Connect Phantom"
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
