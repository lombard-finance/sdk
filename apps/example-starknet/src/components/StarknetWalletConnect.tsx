import { useCallback, useState } from "react";

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

interface StarknetWalletConnectProps {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  walletId: string | null;
  connect: (walletId?: string) => Promise<void>;
  disconnect: () => void;
  installedWallets: { id: string; name: string }[];
}

/**
 * Starknet Wallet Connect Component
 *
 * Provides UI for connecting Starknet wallets (Braavos, Ready Wallet)
 */
export function StarknetWalletConnect({
  address,
  isConnected,
  isConnecting,
  error,
  walletId,
  connect,
  disconnect,
  installedWallets,
}: StarknetWalletConnectProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  if (isConnected && address) {
    return (
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-1">Starknet Wallet</h3>
            <p className="text-sm text-secondary">
              Wallet connected
              {walletId
                ? ` via ${walletId === "braavos" ? "Braavos" : "Ready Wallet"}`
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-lg">
              <code className="text-sm font-mono">
                {address.slice(0, 6)}...{address.slice(-4)}
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
            <button onClick={disconnect} className="btn btn-secondary">
              Disconnect
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="font-semibold mb-3">Starknet Wallet</h3>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {installedWallets.length === 0 ? (
        <div className="text-sm text-secondary">
          <p className="mb-3">
            No Starknet wallet detected. Please install one of the following:
          </p>
          <div className="space-y-2">
            <a
              href="https://braavos.app/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-md border border-capital-green px-4 py-2 text-center text-capital-green transition-colors hover:bg-green-50"
            >
              Install Braavos
            </a>
            <a
              href="https://www.ready.co/download-ready-wallet"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-md border border-capital-green px-4 py-2 text-center text-capital-green transition-colors hover:bg-green-50"
            >
              Install Ready Wallet
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {installedWallets.map((wallet) => (
            <button
              key={wallet.id}
              type="button"
              onClick={() => connect(wallet.id)}
              disabled={isConnecting}
              className="btn btn-primary w-full"
            >
              {isConnecting ? (
                <>
                  <span className="spinner" />
                  Connecting...
                </>
              ) : (
                `Connect ${wallet.name}`
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
