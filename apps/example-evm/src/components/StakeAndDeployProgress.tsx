import { DeployProtocol } from '@lombard.finance/sdk';
import { useCallback, useState } from 'react';

import type {
  StakeAndBakeProgress,
  StakeAndBakeStatus,
} from '../pages/StakeAndDeployPage/useBtcStakeAndDeploy';

interface StakeAndDeployProgressProps {
  depositAddress: string | null;
  amount: string | null;
  status: StakeAndBakeStatus;
  progress: StakeAndBakeProgress;
  onReset: () => void;
  protocol: DeployProtocol;
  targetChain: string;
}

/**
 * Display Stake-and-Deploy progress and status
 */
export function StakeAndDeployProgress({
  depositAddress,
  amount,
  status,
  progress,
  onReset,
  protocol,
  targetChain,
}: StakeAndDeployProgressProps) {
  const getStatusColor = () => {
    switch (status.phase) {
      case 'complete':
        return 'text-success';
      case 'error':
        return 'text-error';
      case 'confirming':
      case 'depositing':
        return 'text-blue-600';
      default:
        return 'text-secondary';
    }
  };

  const getProgressPercentage = () => {
    if (status.phase === 'complete') return 100;
    if (status.phase === 'depositing') return 90;
    if (progress.confirmations && progress.requiredConfirmations) {
      return Math.min(
        (progress.confirmations / progress.requiredConfirmations) * 80,
        80,
      );
    }
    if (status.phase === 'waiting-deposit') return 30;
    if (status.phase === 'authorizing') return 20;
    if (status.phase === 'preparing') return 10;
    return 5;
  };

  const getVaultUrl = () => {
    if (protocol === DeployProtocol.Veda) {
      return 'https://lombard.finance/vaults';
    }
    return 'https://silo.finance';
  };

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="rounded-md border border-gray-300 bg-white p-4">
        <div className={`mb-2 text-sm font-medium ${getStatusColor()}`}>
          {status.message}
        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-blue-600 transition-all duration-500"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>

        {/* Confirmations */}
        {progress.confirmations !== undefined &&
          progress.requiredConfirmations && (
            <div className="mt-2 text-sm text-gray-600">
              Confirmations: {progress.confirmations} /{' '}
              {progress.requiredConfirmations}
            </div>
          )}
      </div>

      {/* Deposit Address */}
      {depositAddress && (
        <DepositAddress depositAddress={depositAddress}>
          {amount && (
            <div className="text-sm text-blue-800">
              Amount: <span className="font-medium">{amount} BTC</span>
            </div>
          )}
        </DepositAddress>
      )}

      {/* Vault Info */}
      {(status.phase === 'depositing' || status.phase === 'complete') && (
        <div className="rounded-md border border-green-300 bg-green-50 p-4">
          <div className="mb-2 font-medium text-green-900">
            🎯 Vault Deployment
          </div>
          <div className="space-y-2 text-sm text-green-800">
            <div>
              <span className="font-medium">Protocol:</span>{' '}
              {protocol === DeployProtocol.Veda
                ? 'Lombard DeFi Vault (Veda)'
                : 'Silo Finance'}
            </div>
            <div>
              <span className="font-medium">Chain:</span> {targetChain}
            </div>
            <div>
              <span className="font-medium">Asset:</span> LBTC (yield-bearing)
            </div>
            {progress.isDeposited && (
              <div className="mt-2 rounded-md bg-white/50 p-2">
                ✅ LBTC successfully deposited to vault!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      {status.phase === 'waiting-deposit' && (
        <div className="rounded-md border border-gray-300 bg-gray-50 p-4">
          <div className="mb-2 font-medium">📝 Next Steps:</div>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-600">
            <li>Copy the Bitcoin deposit address above</li>
            <li>Open your Bitcoin wallet</li>
            <li>Send exactly {amount} BTC to the address</li>
            <li>
              Wait for {progress.requiredConfirmations || 6} confirmations
            </li>
            <li>
              LBTC will be minted and automatically deposited to{' '}
              {protocol === DeployProtocol.Veda ? 'Veda' : 'Silo'} vault
            </li>
            <li>
              Track your position on the{' '}
              <a
                href={getVaultUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                vault dashboard
              </a>
            </li>
          </ol>
        </div>
      )}

      {/* Complete */}
      {status.phase === 'complete' && (
        <div className="rounded-md border border-green-300 bg-green-50 p-4">
          <div className="mb-2 text-lg font-medium text-green-900">
            ✅ Stake and Deploy Complete!
          </div>
          <div className="mb-3 text-sm text-green-800">
            Your BTC has been staked to LBTC and deposited to the{' '}
            {protocol === DeployProtocol.Veda ? 'Veda' : 'Silo'} vault on{' '}
            {targetChain}.
          </div>
          <div className="space-y-2">
            <a
              href={getVaultUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-md bg-green-600 px-4 py-2 text-center text-white hover:bg-green-700"
            >
              View Vault Dashboard →
            </a>
            <button
              onClick={onReset}
              className="w-full rounded-md border border-green-600 px-4 py-2 text-green-600 hover:bg-green-50"
            >
              Start Another Stake-and-Deploy
            </button>
          </div>
        </div>
      )}

      {/* Cancel/Reset button for non-complete phases */}
      {status.phase !== 'complete' && (
        <button
          onClick={onReset}
          className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          {status.phase === 'error' ? 'Start Over' : 'Cancel'}
        </button>
      )}
    </div>
  );
}

function DepositAddress({ depositAddress, children }: { depositAddress: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [depositAddress]);

  return (
    <div className="rounded-md border border-blue-300 bg-blue-50 p-4">
      <div className="mb-2 font-medium text-blue-900">
        Send BTC to this address:
      </div>
      <div className="mb-2 flex items-center gap-2 rounded-md bg-white p-3">
        <span className="flex-1 break-all font-mono text-sm">{depositAddress}</span>
        <button
          type="button"
          onClick={handleCopy}
          title="Copy address"
          className="shrink-0 rounded p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {copied ? '✓' : '⧉'}
        </button>
      </div>
      {children}
    </div>
  );
}
