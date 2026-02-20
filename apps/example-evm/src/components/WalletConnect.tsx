import { useEvmWallet } from '../hooks/useEvmWallet';

/**
 * EVM Wallet connection component
 */
export function WalletConnect() {
  const { address, isConnected, isConnecting, error, connect, disconnect } =
    useEvmWallet();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

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
            <div className="px-3 py-2 bg-gray-100 rounded-lg">
              <code className="text-sm font-mono">
                {formatAddress(address!)}
              </code>
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
