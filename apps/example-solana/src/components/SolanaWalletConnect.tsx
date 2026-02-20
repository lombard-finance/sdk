import { useSolanaWallet } from '../hooks/useSolanaWallet';

/**
 * Solana Wallet Connection Component
 *
 * Provides UI for connecting/disconnecting Solana wallet (Phantom)
 */
export function SolanaWalletConnect() {
  const { address, isConnecting, error, connect, disconnect, isConnected } =
    useSolanaWallet();

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
            <p className="font-mono text-sm break-all">{address}</p>
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
