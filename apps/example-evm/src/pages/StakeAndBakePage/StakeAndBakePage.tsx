import { DeployProtocol, Env } from '@lombard.finance/sdk';
import { useState } from 'react';

import { StakeAndBakeForm } from '../../components/StakeAndBakeForm';
import { StakeAndBakeProgress } from '../../components/StakeAndBakeProgress';
import { WalletConnect } from '../../components/WalletConnect';
import { useBtcStakeAndBake } from './useBtcStakeAndBake';

interface StakeAndBakePageProps {
  env: Env;
}

/**
 * Stake-and-Bake Example Page
 *
 * Demonstrates DeFi Vault Integration with atomic Stake-and-Bake flow:
 * 1. User selects protocol (Veda or Silo) and destination chain
 * 2. Connects EVM wallet for vault shares recipient address
 * 3. Configures stake amount and parameters
 * 4. SDK generates BTC deposit address
 * 5. User sends BTC to the address
 * 6. SDK automatically:
 *    a. Mints LBTC on destination chain
 *    b. Deposits LBTC to the selected vault
 * 7. User receives vault shares and starts earning yield
 *
 * This is an atomic operation - both staking and vault deposit happen together,
 * maximizing capital efficiency.
 */
export function StakeAndBakePage({ env }: StakeAndBakePageProps) {
  const [partnerId, setPartnerId] = useState('');
  const [protocol, setProtocol] = useState<DeployProtocol>(DeployProtocol.Veda);

  const {
    stakeAndBake,
    isInitializing,
    error: sdkError,
    depositAddress,
    stakeAmount,
    status,
    progress,
    reset,
  } = useBtcStakeAndBake(protocol, partnerId, env);

  const getChainName = (chainValue: string): string => {
    const chainLabels: Record<string, string> = {
      'eip155:1': 'Ethereum',
      'eip155:8453': 'Base',
      'eip155:56': 'BNB Chain',
      'eip155:17000': 'Holesky',
      'eip155:84532': 'Base Sepolia',
      'eip155:97': 'BNB Testnet',
    };
    return chainLabels[chainValue] || chainValue;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="mb-2 text-3xl font-bold">🎂 Stake-and-Bake</h1>
        <p className="text-gray-600">
          Stake BTC and automatically deposit LBTC to a DeFi vault in one atomic
          operation
        </p>
      </div>

      {/* Info Banner */}
      <div className="rounded-md border border-blue-300 bg-blue-50 p-4">
        <div className="mb-2 font-semibold text-blue-900">
          💡 What is Stake-and-Bake?
        </div>
        <p className="mb-3 text-sm text-blue-800">
          Stake-and-Bake combines two operations into one seamless flow:
        </p>
        <ol className="ml-4 list-decimal space-y-1 text-sm text-blue-800">
          <li>
            <strong>Stake:</strong> Convert your BTC to LBTC (yield-bearing
            Bitcoin)
          </li>
          <li>
            <strong>Bake:</strong> Automatically deposit LBTC into a DeFi vault
            for additional yield
          </li>
        </ol>
        <p className="mt-3 text-sm font-medium text-blue-900">
          Result: Double yield without manual steps! 🚀
        </p>
      </div>

      {/* Wallet Connection */}
      <div>
        <h2 className="mb-3 text-xl font-semibold">1. Connect EVM Wallet</h2>
        <WalletConnect />
        <p className="mt-2 text-sm text-gray-500">
          Required to receive vault shares. The vault shares will be minted to
          your connected address.
        </p>
      </div>

      {/* Partner ID Configuration */}
      <div>
        <h2 className="mb-3 text-xl font-semibold">2. Partner Configuration</h2>
        <div className="rounded-md border border-gray-300 p-4">
          <label
            htmlFor="partnerId"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Partner ID{' '}
            <span className="text-gray-400">(Optional but recommended)</span>
          </label>
          <input
            type="text"
            id="partnerId"
            value={partnerId}
            onChange={e => setPartnerId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="your-partner-id"
          />
          <p className="mt-1 text-xs text-gray-500">
            Bypasses reCAPTCHA for better UX. Leave empty to use default captcha
            flow.
          </p>
        </div>
      </div>

      {/* Protocol Selection */}
      <div>
        <h2 className="mb-3 text-xl font-semibold">3. Select Protocol</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <button
            onClick={() => setProtocol(DeployProtocol.Veda)}
            className={`rounded-md border p-4 text-left transition-all ${
              protocol === DeployProtocol.Veda
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-300 bg-white hover:border-blue-300'
            }`}
          >
            <div className="mb-2 font-semibold">Lombard DeFi Vault (Veda)</div>
            <div className="text-sm text-gray-600">
              Native vault with optimized yields. Supports Ethereum, Base, BSC,
              Corn.
            </div>
            {protocol === DeployProtocol.Veda && (
              <div className="mt-2 text-xs font-medium text-blue-600">
                ✓ Selected
              </div>
            )}
          </button>

          <button
            onClick={() => setProtocol(DeployProtocol.Silo)}
            disabled={env === Env.prod}
            className={`rounded-md border p-4 text-left transition-all ${
              protocol === DeployProtocol.Silo
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-300 bg-white hover:border-blue-300'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <div className="mb-2 font-semibold">
              Silo Finance {env === Env.prod && '(Testnet only)'}
            </div>
            <div className="text-sm text-gray-600">
              Third-party vault integration. Available on Avalanche.
            </div>
            {protocol === DeployProtocol.Silo && env !== Env.prod && (
              <div className="mt-2 text-xs font-medium text-blue-600">
                ✓ Selected
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Staking Form */}
      <div>
        <h2 className="mb-3 text-xl font-semibold">
          4. Configure Stake-and-Bake
        </h2>
        <StakeAndBakeForm
          env={env}
          onSubmit={stakeAndBake}
          isLoading={status.phase !== 'idle' && status.phase !== 'complete'}
          onReset={reset}
        />
      </div>

      {/* Status Display */}
      {isInitializing && (
        <div className="rounded-md border border-gray-300 bg-gray-50 p-4">
          <p className="text-sm text-gray-600">Initializing SDK...</p>
        </div>
      )}

      {sdkError && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Error</p>
          <p className="mt-1 text-sm text-red-600">{sdkError}</p>
        </div>
      )}

      {/* Progress */}
      {status.phase !== 'idle' && (
        <div>
          <h2 className="mb-3 text-xl font-semibold">5. Progress</h2>
          <StakeAndBakeProgress
            status={status}
            depositAddress={depositAddress}
            amount={stakeAmount}
            progress={progress}
            onReset={reset}
            protocol={protocol}
            targetChain={getChainName(String(status))}
          />
        </div>
      )}

      {/* Information */}
      <div className="rounded-md border border-gray-300 bg-gray-50 p-4">
        <h3 className="mb-2 font-semibold">Benefits of Stake-and-Bake</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>
            <strong>🎯 Atomic Operation:</strong> Both staking and vault deposit
            happen automatically
          </li>
          <li>
            <strong>⚡ Capital Efficiency:</strong> Your BTC starts earning
            double yield immediately
          </li>
          <li>
            <strong>🛡️ Security:</strong> No intermediate steps where funds
            could be lost
          </li>
          <li>
            <strong>💰 Gas Savings:</strong> Single transaction for both
            operations
          </li>
          <li>
            <strong>📊 Full Control:</strong> Choose your preferred vault
            protocol and chain
          </li>
        </ul>
      </div>

      {/* How it works */}
      <div className="rounded-md border border-gray-300 bg-gray-50 p-4">
        <h3 className="mb-2 font-semibold">How it works</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <span className="font-bold text-blue-600">1.</span>
            <span>Connect your EVM wallet and select a vault protocol</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-blue-600">2.</span>
            <span>Enter BTC amount and destination chain</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-blue-600">3.</span>
            <span>Authorize the vault deposit with your wallet signature</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-blue-600">4.</span>
            <span>Receive a unique Bitcoin deposit address</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-blue-600">5.</span>
            <span>Send BTC to the address from any Bitcoin wallet</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-blue-600">6.</span>
            <span>SDK automatically mints LBTC and deposits to vault</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-blue-600">7.</span>
            <span>Receive vault shares and start earning double yield! 🎉</span>
          </div>
        </div>
      </div>
    </div>
  );
}
