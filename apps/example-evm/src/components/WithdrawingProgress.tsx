import { Chain, getExplorerTxUrl } from '@lombard.finance/sdk';

import { getStatusColor } from '../lib/status-colors';
import type { WithdrawStatus } from '../pages/WithdrawPage/useEvmUnstaking';

interface UnstakingProgressProps {
  txHash: string | null;
  status: WithdrawStatus;
  /**
   * The chain the burn happened on. `null` before a submission has set it —
   * `getExplorerTxUrl` needs a real `Chain` to pick the right explorer, so the
   * absence is modelled rather than stood in for by an empty string.
   */
  sourceChain: Chain | null;
  onReset: () => void;
}

/**
 * Display unstaking progress and transaction status
 */
export function WithdrawingProgress({
  txHash,
  status,
  sourceChain,
  onReset,
}: UnstakingProgressProps) {
  const isComplete = status.phase === 'complete';
  const hasError = status.phase === 'error';

  const getExplorerUrl = (hash: string) => {
    return (
      (sourceChain === null ? undefined : getExplorerTxUrl(sourceChain, hash)) ??
      `https://etherscan.io/tx/${hash}`
    );
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-semibold mb-6">Unstaking Progress</h2>

      {/* Status */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          {!isComplete && !hasError && <span className="spinner" />}
          <span
            className={`text-lg font-medium ${getStatusColor(status.phase)}`}
          >
            {status.message}
          </span>
        </div>

        {/* Transaction Progress */}
        {status.phase === 'executing' && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Transaction Status</span>
              <span className="font-medium">Processing...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-capital-green h-2 rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        )}
      </div>

      {/* Transaction Hash */}
      {txHash && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Transaction Hash
          </label>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <code className="text-sm break-all font-mono">{txHash}</code>
          </div>
          <a
            href={getExplorerUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-capital-green hover:underline"
          >
            View on Explorer →
          </a>
        </div>
      )}

      {/* Action buttons */}
      {isComplete || hasError ? (
        <button onClick={onReset} className="btn btn-secondary w-full">
          Start New Unstake
        </button>
      ) : (
        <button onClick={onReset} className="btn btn-secondary w-full text-sm">
          Cancel
        </button>
      )}

      {/* Instructions */}
      {status.phase === 'preparing' && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold mb-2 text-sm">What happens next:</h4>
          <ol className="text-sm space-y-1 text-secondary">
            <li>1. Sign the transaction in your wallet</li>
            <li>2. Wait for transaction confirmation</li>
            <li>3. Your BTC/BTC.b will be sent to the recipient address</li>
          </ol>
        </div>
      )}

      {status.phase === 'executing' && (
        <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h4 className="font-semibold mb-2 text-sm">Processing Transaction</h4>
          <p className="text-sm text-secondary">
            Your LBTC is being burned and BTC is being released. This may take a
            few minutes.
          </p>
        </div>
      )}
    </div>
  );
}
