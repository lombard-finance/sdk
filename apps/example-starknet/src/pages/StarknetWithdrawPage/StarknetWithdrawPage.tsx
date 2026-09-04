import { Env } from '@lombard.finance/sdk';

import { StarknetWithdrawingForm } from '../../components/StarknetWithdrawingForm';
import { StarknetWithdrawingProgress } from '../../components/StarknetWithdrawingProgress';
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
 *
 * Note: Partner ID is not required for unstaking (pure on-chain operation).
 */
export function StarknetWithdrawPage({ env }: { env: Env }) {
  const {
    address: starknetAddress,
    isConnected: isStarknetConnected,
    isConnecting: isStarknetConnecting,
    error: starknetWalletError,
    walletId: starknetWalletId,
    provider: starknetProvider,
    connect: connectStarknet,
    disconnect: disconnectStarknet,
    installedWallets: starknetInstalledWallets,
  } = useStarknetWallet();

  const { unstake, reset, isInitializing, error, txHash, status } =
    useStarknetUnstaking(
      starknetAddress,
      env,
      starknetProvider,
      starknetWalletId,
    );

  return (
    <div className="py-8">
      <div className="container">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-4 text-primary">
              Starknet LBTC Unstake
            </h1>
            <p className="text-secondary text-lg">
              Burn LBTC on Starknet to receive BTC on Bitcoin using the Lombard
              SDK
            </p>
          </div>

          {/* Wallet Connection (required) */}
          <div className="mb-6">
            <StarknetWalletConnect
              address={starknetAddress}
              isConnected={isStarknetConnected}
              isConnecting={isStarknetConnecting}
              error={starknetWalletError}
              walletId={starknetWalletId}
              connect={connectStarknet}
              disconnect={disconnectStarknet}
              installedWallets={starknetInstalledWallets}
            />
            {!starknetAddress && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-900">
                  ⚠️ Starknet wallet connection is required to sign unstake
                  transactions
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="card mb-6 bg-red-50 border border-red-200">
              <h3 className="text-error font-semibold mb-2">SDK Error</h3>
              <p className="text-sm text-error">{error}</p>
              <button
                onClick={reset}
                className="mt-3 text-sm text-error underline"
              >
                Reset
              </button>
            </div>
          )}

          {isStarknetConnected ? (
            status.phase === 'idle' ? (
              <StarknetWithdrawingForm
                onSubmit={unstake}
                isSubmitting={isInitializing}
                env={env}
              />
            ) : (
              <StarknetWithdrawingProgress
                status={status}
                txHash={txHash}
                env={env}
                onReset={reset}
              />
            )
          ) : (
            <div className="card">
              <p className="text-secondary text-sm">
                Connect your Starknet wallet above to continue.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
