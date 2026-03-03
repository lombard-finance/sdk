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
  const isActivelyLoading = ['preparing', 'executing'].includes(status.phase);

  const getStatusColor = () => {
    if (isError) return 'text-error';
    if (isComplete) return 'text-success';
    if (isActivelyLoading) return 'text-warning';
    return 'text-primary';
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-semibold mb-6">
        {isComplete ? 'Unstake Complete' : isError ? 'Unstaking Error' : 'Unstaking Progress'}
      </h2>

      {/* Status */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          {isActivelyLoading && <span className="spinner" />}
          <span className={`text-lg font-medium ${getStatusColor()}`}>
            {status.message}
          </span>
        </div>
      </div>

      {/* Transaction Hash */}
      {txHash && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Transaction Hash
          </label>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-2">
            <code className="text-sm break-all font-mono">{txHash}</code>
          </div>
          <a
            href={getSolanaExplorerUrl(txHash, sourceChain)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-capital-green hover:underline"
          >
            View on Solana Explorer →
          </a>
        </div>
      )}

      {/* Instructions */}
      {isActivelyLoading && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold mb-2 text-sm">What's happening?</h4>
          <ul className="text-sm text-secondary space-y-1">
            {status.phase === 'preparing' && (
              <>
                <li>• Preparing the unstake transaction</li>
                <li>• Validating amount and Bitcoin recipient address</li>
              </>
            )}
            {status.phase === 'executing' && (
              <>
                <li>• Burning LBTC tokens on Solana</li>
                <li>• Please confirm the transaction in your wallet</li>
                <li>• BTC will be released to your Bitcoin address automatically</li>
              </>
            )}
          </ul>
        </div>
      )}

      {/* Success */}
      {isComplete && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-semibold mb-2 text-sm text-green-900">
            ✓ Unstake Complete
          </h4>
          <p className="text-sm text-green-800">
            LBTC has been burned on Solana. BTC will be sent to your Bitcoin address shortly.
          </p>
        </div>
      )}

      {/* Action buttons */}
      {(isComplete || isError) ? (
        <button onClick={onReset} className="btn btn-secondary w-full">
          Start New Unstake
        </button>
      ) : (
        <button onClick={onReset} className="btn btn-secondary w-full mt-4 text-sm">
          Cancel
        </button>
      )}
    </div>
  );
}
