import { Env } from '@lombard.finance/sdk';

import type { UnstakingStatus } from '../lib/types';

interface StarknetUnstakingProgressProps {
  status: UnstakingStatus;
  txHash?: string | null;
  env?: Env;
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
}: StarknetUnstakingProgressProps) {
  const getExplorerUrl = (hash: string) => {
    const baseUrl =
      env === Env.prod
        ? 'https://voyager.online'
        : 'https://sepolia.voyager.online';
    return `${baseUrl}/tx/${hash}`;
  };

  const getStatusColor = () => {
    switch (status.phase) {
      case 'complete':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'idle':
        return 'bg-gray-50 text-gray-600 border-gray-200';
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className={`rounded-md border p-4 ${getStatusColor()}`}>
      <div className="mb-2 text-sm font-medium">Status: {status.message}</div>

      {txHash && (
        <div className="mt-3 space-y-2 text-sm">
          <div>
            <span className="font-medium">Transaction Hash:</span>
            <div className="mt-1 break-all font-mono text-xs">{txHash}</div>
          </div>
          <a
            href={getExplorerUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-blue-600 underline hover:text-blue-800"
          >
            View on Explorer →
          </a>
        </div>
      )}

      {status.phase === 'complete' && (
        <div className="mt-3 rounded-md bg-white/50 p-3 text-sm">
          <div className="font-medium">Next Steps:</div>
          <ul className="ml-4 mt-1 list-disc space-y-1">
            <li>LBTC has been burned on Starknet</li>
            <li>BTC will be released to your Bitcoin address</li>
            <li>Check the transaction on Starknet explorer</li>
          </ul>
        </div>
      )}
    </div>
  );
}
