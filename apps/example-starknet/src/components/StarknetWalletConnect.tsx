import { useCallback, useState } from 'react';

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.667 4.667V4c0-.934 0-1.4.181-1.757a1.667 1.667 0 0 1 .729-.728C5.933 1.333 6.4 1.333 7.333 1.333H12c.934 0 1.4 0 1.757.182.313.16.569.415.728.728.182.357.182.823.182 1.757v4.667c0 .933 0 1.4-.182 1.756-.16.314-.415.569-.728.729-.357.181-.823.181-1.757.181h-.667M11.333 7.333V12c0 .933 0 1.4-.181 1.757a1.667 1.667 0 0 1-.729.728c-.356.182-.823.182-1.756.182H4c-.933 0-1.4 0-1.757-.182a1.667 1.667 0 0 1-.728-.728C1.333 13.4 1.333 12.933 1.333 12V7.333c0-.933 0-1.4.182-1.756.16-.314.415-.569.728-.729.357-.181.824-.181 1.757-.181h4.667c.933 0 1.4 0 1.756.181.314.16.569.415.729.729.181.356.181.823.181 1.756Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.333 4 6 11.333 2.667 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
      <div className="rounded-md border border-gray-300 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
              Starknet Wallet Connected
            </div>
            <div className="flex items-center gap-1.5 font-mono text-sm">
              <span>{address.slice(0, 8)}...{address.slice(-6)}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center justify-center rounded p-0.5 text-gray-400 transition-colors hover:text-gray-600"
                title="Copy address"
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </button>
            </div>
            {walletId && (
              <div className="mt-1 text-xs text-gray-500">
                Using {walletId === 'braavos' ? 'Braavos' : 'Ready Wallet'}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={disconnect}
            className="rounded-md border border-red-600 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-gray-300 p-4">
      <div className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
        Connect Starknet Wallet
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {installedWallets.length === 0 ? (
        <div className="text-sm text-gray-600">
          <p className="mb-3">
            No Starknet wallet detected. Please install one of the following:
          </p>
          <div className="space-y-2">
            <a
              href="https://braavos.app/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-md border border-blue-600 px-4 py-2 text-center text-blue-600 transition-colors hover:bg-blue-50"
            >
              Install Braavos
            </a>
            <a
              href="https://www.ready.co/download-ready-wallet"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-md border border-blue-600 px-4 py-2 text-center text-blue-600 transition-colors hover:bg-blue-50"
            >
              Install Ready Wallet
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {installedWallets.map(wallet => (
            <button
              key={wallet.id}
              type="button"
              onClick={() => connect(wallet.id)}
              disabled={isConnecting}
              className="w-full rounded-md border border-blue-600 bg-white px-4 py-2 text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isConnecting ? 'Connecting...' : `Connect ${wallet.name}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
