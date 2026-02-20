import { StarknetUnstakingForm } from '../../components/StarknetUnstakingForm';
import { StarknetUnstakingProgress } from '../../components/StarknetUnstakingProgress';
import { StarknetWalletConnect } from '../../components/StarknetWalletConnect';
import { useStarknetWallet } from '../../hooks/useStarknetWallet';
import { useStarknetUnstaking } from './useStarknetUnstaking';

/**
 * Starknet Unstake Page
 *
 * Example: Unstake LBTC (from Starknet) → BTC
 *
 * Demonstrates:
 * - Connecting Starknet wallet
 * - Burning LBTC on Starknet
 * - Receiving BTC on Bitcoin network
 * - Monitoring unstake progress
 */
export function StarknetUnstakePage() {
  const {
    address: starknetAddress,
    isConnected: isStarknetConnected,
    provider: starknetProvider,
    walletId: starknetWalletId,
  } = useStarknetWallet();

  const { unstake, reset, isInitializing, error, txHash, status } =
    useStarknetUnstaking(
      starknetAddress,
      undefined, // env (will use default)
      starknetProvider,
      starknetWalletId,
    );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Starknet Unstake</h1>
        <p className="text-gray-600">
          Unstake LBTC from Starknet to receive Bitcoin
        </p>
      </div>

      {/* Starknet Wallet Connection */}
      <div>
        <h2 className="mb-3 text-xl font-semibold">
          1. Connect Starknet Wallet
        </h2>
        <StarknetWalletConnect />
      </div>

      {/* Unstaking Form */}
      <div>
        <h2 className="mb-3 text-xl font-semibold">2. Configure Unstake</h2>
        {isStarknetConnected ? (
          <StarknetUnstakingForm
            onSubmit={unstake}
            isSubmitting={
              status.phase !== 'idle' && status.phase !== 'complete'
            }
          />
        ) : (
          <div className="rounded-md border border-gray-300 bg-gray-50 p-4">
            <p className="text-sm text-gray-600">
              Please connect your Starknet wallet to continue
            </p>
          </div>
        )}
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
          <button
            onClick={reset}
            className="mt-2 rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
          >
            Reset
          </button>
        </div>
      )}

      {/* Progress */}
      {status.phase !== 'idle' && (
        <div>
          <h2 className="mb-3 text-xl font-semibold">3. Progress</h2>
          <StarknetUnstakingProgress status={status} txHash={txHash} />
        </div>
      )}

      {/* Information */}
      <div className="rounded-md border border-gray-300 bg-gray-50 p-4">
        <h3 className="mb-2 font-semibold">How it works</h3>
        <ul className="space-y-1 text-sm text-gray-600">
          <li>1. Connect your Starknet wallet</li>
          <li>2. Enter the amount of LBTC to unstake</li>
          <li>3. Provide a Bitcoin address to receive BTC</li>
          <li>4. Execute the unstake transaction</li>
          <li>5. LBTC will be burned on Starknet</li>
          <li>6. BTC will be released to your Bitcoin address</li>
        </ul>
      </div>
    </div>
  );
}
