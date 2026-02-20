import { Chain } from '@lombard.finance/sdk';

import type { SolanaUnstakingStatus } from '../pages/SolanaUnstakePage/useSolanaUnstaking';

interface SolanaUnstakingProgressProps {
  txHash: string | null;
  status: SolanaUnstakingStatus;
  sourceChain: string;
  onReset: () => void;
}

/**
 * Get Solana explorer URL for transaction
 */
function getSolanaExplorerUrl(txHash: string, chain: string): string {
  const isMainnet = chain === Chain.SOLANA_MAINNET;
  const cluster = isMainnet ? '' : '?cluster=devnet';
  return `https://explorer.solana.com/tx/${txHash}${cluster}`;
}

/**
 * Solana Unstaking Progress Component
 *
 * Displays the progress of LBTC unstaking on Solana
 */
export function SolanaUnstakingProgress({
  txHash,
  status,
  sourceChain,
  onReset,
}: SolanaUnstakingProgressProps) {
  const isComplete = status.phase === 'complete';
  const isError = status.phase === 'error';

  const getPhaseIcon = () => {
    if (isError) return '❌';
    if (isComplete) return '✅';
    if (status.phase === 'executing') return '⏳';
    return '🔄';
  };

  const getPhaseColor = () => {
    if (isError) return 'text-red-600';
    if (isComplete) return 'text-green-600';
    return 'text-blue-600';
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{getPhaseIcon()}</span>
          <div className="flex-1">
            <h3 className={`font-semibold text-lg ${getPhaseColor()}`}>
              {status.phase === 'idle' && 'Initializing...'}
              {status.phase === 'preparing' && 'Preparing Unstake'}
              {status.phase === 'executing' && 'Burning LBTC'}
              {status.phase === 'complete' && 'Unstake Complete!'}
              {status.phase === 'error' && 'Error'}
            </h3>
            <p className="text-sm text-secondary mt-1">{status.message}</p>
          </div>
        </div>

        {/* Transaction Hash */}
        {txHash && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-medium mb-2">Transaction Hash</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs break-all font-mono bg-white px-3 py-2 rounded border">
                {txHash}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(txHash)}
                className="px-3 py-2 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                title="Copy transaction hash"
              >
                Copy
              </button>
            </div>

            <a
              href={getSolanaExplorerUrl(txHash, sourceChain)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-sm text-blue-600 hover:underline"
            >
              View on Solana Explorer →
            </a>
          </div>
        )}
      </div>

      {/* Instructions */}
      {!isComplete && !isError && (
        <div className="card bg-blue-50 border-blue-200">
          <h4 className="font-semibold mb-2 text-blue-900">
            What's happening?
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            {status.phase === 'preparing' && (
              <>
                <li>• SDK is preparing the unstake transaction</li>
                <li>• Validating amount and Bitcoin recipient address</li>
              </>
            )}
            {status.phase === 'executing' && (
              <>
                <li>• Burning LBTC tokens on Solana</li>
                <li>• Please confirm the transaction in your Phantom wallet</li>
                <li>
                  • BTC will be released to your Bitcoin address automatically
                </li>
              </>
            )}
          </ul>
        </div>
      )}

      {/* Success Message */}
      {isComplete && (
        <div className="card bg-green-50 border-green-200">
          <h4 className="font-semibold mb-2 text-green-900">🎉 Success!</h4>
          <p className="text-sm text-green-800 mb-3">
            Your LBTC has been burned on Solana. BTC will be released to your
            Bitcoin address.
          </p>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• LBTC tokens have been burned on {sourceChain}</li>
            <li>• BTC release is being processed on Bitcoin network</li>
            <li>
              • This may take some time depending on Bitcoin network
              confirmations
            </li>
          </ul>
        </div>
      )}

      {/* Error Instructions */}
      {isError && (
        <div className="card bg-red-50 border-red-200">
          <h4 className="font-semibold mb-2 text-red-900">Common Issues</h4>
          <ul className="text-sm text-red-800 space-y-2">
            <li>
              <strong>Wallet Network Mismatch:</strong> Ensure your Phantom
              wallet is on the correct network (Mainnet for production, Devnet
              for testnet)
            </li>
            <li>
              <strong>Insufficient Balance:</strong> Make sure you have enough
              LBTC and SOL for gas fees
            </li>
            <li>
              <strong>Invalid Bitcoin Address:</strong> Verify your Bitcoin
              address format is correct
            </li>
          </ul>
        </div>
      )}

      {/* Reset Button */}
      {(isComplete || isError) && (
        <button
          onClick={onReset}
          className="w-full px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors font-semibold"
        >
          Start New Unstake
        </button>
      )}
    </div>
  );
}
