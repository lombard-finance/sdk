import type { StakingProgressInfo, StakingStatus } from '../lib/types';

interface StakingProgressProps {
  depositAddress: string | null;
  amount: string | null;
  status: StakingStatus;
  progress: StakingProgressInfo;
  onReset: () => void;
  targetChain?: string;
}

/**
 * Display staking progress and status
 */
export function StakingProgress({
  depositAddress,
  amount,
  status,
  progress,
  onReset,
  targetChain = 'destination chain',
}: StakingProgressProps) {
  const getStatusColor = () => {
    switch (status.phase) {
      case 'complete':
        return 'text-success';
      case 'error':
        return 'text-error';
      case 'confirming':
      case 'minting':
        return 'text-warning';
      default:
        return 'text-primary';
    }
  };

  const isComplete = status.phase === 'complete';
  const hasError = status.phase === 'error';

  return (
    <div className="card">
      <h2 className="text-2xl font-semibold mb-6">Staking Progress</h2>

      {/* Status */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          {!isComplete && !hasError && <span className="spinner" />}
          <span className={`text-lg font-medium ${getStatusColor()}`}>
            {status.message}
          </span>
        </div>

        {/* Progress details */}
        {progress.confirmations !== undefined && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Confirmations</span>
              <span className="font-medium">
                {progress.confirmations} / {progress.requiredConfirmations || 6}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-capital-green h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    ((progress.confirmations || 0) /
                      (progress.requiredConfirmations || 6)) *
                      100,
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Deposit Address */}
      {depositAddress && (
        <div className="mb-6">
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Amount to Send:</span>
              <span className="text-lg font-bold text-primary">
                {amount} BTC
              </span>
            </div>
            <p className="text-xs text-secondary">
              Send exactly this amount to ensure proper processing
            </p>
          </div>

          <label className="block text-sm font-medium mb-2">
            Bitcoin Deposit Address
          </label>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <code className="text-sm break-all font-mono">
              {depositAddress}
            </code>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(depositAddress)}
            className="mt-2 text-sm text-capital-green hover:underline"
          >
            📋 Copy Address
          </button>
        </div>
      )}

      {/* Action buttons */}
      {(isComplete || hasError) && (
        <button onClick={onReset} className="btn btn-secondary w-full">
          Start New Stake
        </button>
      )}

      {/* Instructions */}
      {status.phase === 'waiting-deposit' && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold mb-2 text-sm">Next Steps:</h4>
          <ol className="text-sm space-y-1 text-secondary">
            <li>1. Copy the deposit address above</li>
            <li>2. Open your Bitcoin wallet</li>
            <li>3. Send the BTC amount to this address</li>
            <li>
              4. Wait for confirmations (this page will update automatically)
            </li>
            <li>5. LBTC will be minted to your address on {targetChain}</li>
          </ol>
        </div>
      )}
    </div>
  );
}
