import { useStarknetWallet } from '../hooks/useStarknetWallet';

/**
 * Starknet Wallet Connect Component
 *
 * Provides UI for connecting Starknet wallets (Braavos, Ready Wallet)
 */
export function StarknetWalletConnect() {
  const {
    address,
    isConnected,
    isConnecting,
    error,
    walletId,
    connect,
    disconnect,
    installedWallets,
  } = useStarknetWallet();

  if (isConnected && address) {
    return (
      <div className="rounded-md border border-gray-300 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
              Starknet Wallet Connected
            </div>
            <div className="font-mono text-sm">
              {address.slice(0, 8)}...{address.slice(-6)}
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
