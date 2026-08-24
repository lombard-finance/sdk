import { Chain, Env, getExplorerTxUrl } from '@lombard.finance/sdk';

import type { WithdrawStatus } from '../lib/types';

interface SuiUnstakingProgressProps {
  txHash: string | null;
  status: WithdrawStatus;
  onReset: () => void;
  env: Env;
}

/**
 * Display Sui unstaking progress and status
 */
export function SuiUnstakingProgress({
  txHash,
  status,
  onReset,
  env,
}: SuiUnstakingProgressProps) {
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

  const isComplete = status.phase === 'complete';
  const hasError = status.phase === 'error';

  const getExplorerUrl = (hash: string) => {
    const chain = env === Env.prod ? Chain.SUI_MAINNET : Chain.SUI_TESTNET;
    return (
      getExplorerTxUrl(chain, hash) ?? `https://suiscan.xyz/mainnet/tx/${hash}`
    );
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-semibold mb-6">Unstaking Progress</h2>

      {/* Status */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          {!isComplete && !hasError && <span className="spinner" />}
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
            View on Sui Explorer →
          </a>
        </div>
      )}

      {/* Source and Destination */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">
            Source Chain
          </label>
          <p className="text-sm font-medium">
            {env === Env.prod ? 'Sui Mainnet' : 'Sui Testnet'}
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">
            Destination Chain
          </label>
          <p className="text-sm font-medium">
            {env === Env.prod ? 'Bitcoin Mainnet' : 'Bitcoin Signet'}
          </p>
        </div>
      </div>

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

      {/* Instructions */}
      {status.phase === 'confirming' && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold mb-2 text-sm">Transaction Submitted</h4>
          <p className="text-sm text-secondary">
            Your transaction has been submitted to Sui network. BTC will be
            released to your Bitcoin address after confirmation.
          </p>
        </div>
      )}

      {isComplete && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-semibold mb-2 text-sm text-green-900">
            ✓ Unstake Complete
          </h4>
          <p className="text-sm text-green-800">
            LBTC has been burned on Sui. BTC will be sent to your Bitcoin
            address shortly.
          </p>
        </div>
      )}
    </div>
  );
}
