import { Chain, Env } from '@lombard.finance/sdk';

import { StakingForm } from '../../components/StakingForm';
import { StakingProgress } from '../../components/StakingProgress';
import { StarknetWalletConnect } from '../../components/StarknetWalletConnect';
import { useStarknetWallet } from '../../hooks/useStarknetWallet';
import { useBtcStakingStarknet } from './useBtcStakingStarknet';

/**
 * Starknet Stake Page
 *
 * Example: Stake BTC → LBTC (on Starknet)
 *
 * Demonstrates:
 * - Connecting Starknet wallet
 * - Preparing stake with Starknet destination
 * - Authorizing with Starknet signature
 * - Generating Bitcoin deposit address
 * - Monitoring stake lifecycle with events
 */
export function StarknetStakePage() {
  const {
    address: starknetAddress,
    isConnected: isStarknetConnected,
    provider: starknetProvider,
  } = useStarknetWallet();

  const {
    stake,
    reset,
    isInitializing,
    error,
    depositAddress,
    status,
    stakeAmount,
    progress,
  } = useBtcStakingStarknet(
    starknetProvider,
    undefined, // partnerId
    Env.testnet, // env
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Starknet Stake</h1>
        <p className="text-gray-600">
          Stake Bitcoin to receive LBTC on Starknet
        </p>
      </div>

      {/* Starknet Wallet Connection */}
      <div>
        <h2 className="mb-3 text-xl font-semibold">
          1. Connect Starknet Wallet
        </h2>
        <StarknetWalletConnect />
      </div>

      {/* Staking Form */}
      <div>
        <h2 className="mb-3 text-xl font-semibold">2. Configure Stake</h2>
        <StakingForm
          onSubmit={stake}
          isLoading={status.phase !== 'idle' && status.phase !== 'complete'}
          disabled={!isStarknetConnected}
          solanaAddress={starknetAddress}
          fixedDestChain={Chain.STARKNET_MAINNET}
          env={Env.testnet}
        />
      </div>

      {/* Status Display */}
      {isInitializing && (
        <div className="rounded-md border border-gray-300 bg-gray-50 p-4">
          <p className="text-sm text-gray-600">Initializing SDK...</p>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Error</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Progress */}
      {status.phase !== 'idle' && (
        <div>
          <h2 className="mb-3 text-xl font-semibold">3. Progress</h2>
          <StakingProgress
            status={status}
            depositAddress={depositAddress}
            amount={stakeAmount}
            progress={progress}
            onReset={reset}
            targetChain="Starknet"
          />
        </div>
      )}

      {/* Information */}
      <div className="rounded-md border border-gray-300 bg-gray-50 p-4">
        <h3 className="mb-2 font-semibold">How it works</h3>
        <ul className="space-y-1 text-sm text-gray-600">
          <li>1. Connect your Starknet wallet (Braavos or Ready Wallet)</li>
          <li>2. Enter the amount of BTC you want to stake</li>
          <li>3. Authorize the stake with your Starknet wallet</li>
          <li>4. Receive a Bitcoin deposit address</li>
          <li>5. Send BTC to the address</li>
          <li>6. Receive LBTC on Starknet</li>
        </ul>
      </div>
    </div>
  );
}
