import { Env } from '@lombard.finance/sdk';

import type { WithdrawStatus } from '../lib/types';

interface StarknetUnstakingProgressProps {
  status: WithdrawStatus;
  txHash?: string | null;
  env?: Env;
  onReset: () => void;
}

/**
 * Starknet Unstaking Progress Component
 *
 * Displays progress for Starknet unstaking operations
 */
export function StarknetUnstakingProgress({
  status,
  txHash,
  env = Env.testnet,
  onReset,
}: StarknetUnstakingProgressProps) {
  const getExplorerUrl = (hash: string) => {
    const baseUrl =
      env === Env.prod
        ? 'https://voyager.online'
        : 'https://sepolia.voyager.online';
    return `${baseUrl}/tx/${hash}`;
  };

  const isComplete = status.phase === 'complete';
  const hasError = status.phase === 'error';
  const isActivelyLoading = !isComplete && !hasError && status.phase !== 'idle';

  const getStatusColor = () => {
    switch (status.phase) {
      case 'complete':
        return 'text-success';
      case 'error':
        return 'text-error';
      case 'confirming':
      case 'executing':
        return 'text-warning';
      default:
        return 'text-primary';
    }
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-semibold mb-6">
        {isComplete
          ? 'Unstake Complete'
          : hasError
            ? 'Unstaking Error'
            : 'Unstaking Progress'}
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
            href={getExplorerUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-capital-green hover:underline"
          >
            View on Starknet Explorer →
          </a>
        </div>
      )}

      {/* Success */}
      {isComplete && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-semibold mb-2 text-sm text-green-900">
            ✓ Unstake Complete
          </h4>
          <p className="text-sm text-green-800">
            LBTC has been burned on Starknet. BTC will be sent to your Bitcoin
            address shortly.
          </p>
        </div>
      )}

      {/* Action buttons */}
      {isComplete || hasError ? (
        <button onClick={onReset} className="btn btn-secondary w-full">
          Start New Unstake
        </button>
      ) : (
        <button
          onClick={onReset}
          className="btn btn-secondary w-full mt-4 text-sm"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
