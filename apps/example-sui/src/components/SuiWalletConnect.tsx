import { useSuiWallet } from '../hooks/useSuiWallet';

/**
 * Component for connecting Sui wallet (Sui Wallet or Suiet)
 */
export function SuiWalletConnect() {
  const { address, isConnected, isConnecting, error, connect, disconnect } =
    useSuiWallet();

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Sui Wallet</h3>

      {!isConnected ? (
        <div>
          <p className="text-sm text-secondary mb-4">
            Connect your Sui wallet (Sui Wallet or Suiet extension) to interact
            with Sui network
          </p>
          <button
            onClick={connect}
            disabled={isConnecting}
            className="btn btn-primary w-full"
          >
            {isConnecting ? (
              <>
                <span className="spinner" />
                Connecting...
              </>
            ) : (
              'Connect Sui Wallet'
            )}
          </button>
          {error && <p className="text-xs text-error mt-2">{error}</p>}
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-secondary mb-1">
              Connected Address
            </label>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <code className="text-sm break-all font-mono">{address}</code>
            </div>
          </div>
          <button onClick={disconnect} className="btn btn-secondary w-full">
            Disconnect
          </button>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-900">
          💡 <strong>Tip:</strong> Install{' '}
          <a
            href="https://chrome.google.com/webstore/detail/sui-wallet"
            target="_blank"
            rel="noopener noreferrer"
            className="text-capital-green hover:underline"
          >
            Sui Wallet
          </a>{' '}
          or{' '}
          <a
            href="https://suiet.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-capital-green hover:underline"
          >
            Suiet
          </a>{' '}
          browser extension if you haven't already.
        </p>
      </div>
    </div>
  );
}
