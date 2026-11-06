import { type Chain, Env, getLbtcContractAddresses } from '@lombard.finance/sdk';
import { useEffect, useState } from 'react';

import { WithdrawForm } from '../../components/WithdrawForm';
import { WithdrawingProgress } from '../../components/WithdrawingProgress';
import { WalletConnect } from '../../components/WalletConnect';
import { useEvmWallet } from '../../hooks/useEvmWallet';
import type { WithdrawFormData } from './useEvmUnstaking';
import { useEvmUnstaking } from './useEvmUnstaking';

interface UnstakePageProps {
  env: Env;
  onReset?: () => void;
}

/**
 * Unstake Example Page
 *
 * Demonstrates LBTC -> BTC/BTCb unstaking flow:
 * 1. Connect EVM wallet (required for transaction signing)
 * 2. Select output asset (BTC cross-chain or BTC.b same-chain)
 * 3. Enter amount and recipient address
 * 4. Execute burn transaction
 * 5. Receive BTC/BTC.b at recipient address
 *
 * Note: Partner ID is not required for unstaking (pure on-chain operation).
 */
export function WithdrawPage({ env, onReset }: UnstakePageProps) {
  const [isUnstaking, setIsUnstaking] = useState(false);
  // `Chain | null` rather than `''`: the empty string is not a chain, and
  // typing it as one is what let a bare string reach `getExplorerTxUrl`.
  const [sourceChain, setSourceChain] = useState<Chain | null>(null);
  const [lbtcBalance, setLbtcBalance] = useState<string | null>(null);
  const { address: evmAddress } = useEvmWallet();

  useEffect(() => {
    if (!evmAddress || !window.ethereum) {
      setLbtcBalance(null);
      return;
    }

    const fetchBalance = async () => {
      try {
        const chainIdHex = (await window.ethereum!.request({
          method: 'eth_chainId',
        })) as string;
        const chainId = parseInt(chainIdHex, 16);

        const addresses = getLbtcContractAddresses(env);
        const lbtcAddress = addresses[chainId as keyof typeof addresses];
        if (!lbtcAddress) {
          setLbtcBalance(null);
          return;
        }

        const data =
          '0x70a08231' + evmAddress.slice(2).toLowerCase().padStart(64, '0');
        const result = (await window.ethereum!.request({
          method: 'eth_call',
          params: [{ to: lbtcAddress, data }, 'latest'],
        })) as string;

        const balance = BigInt(result);
        const whole = balance / 10n ** 8n;
        const fraction = (balance % 10n ** 8n)
          .toString()
          .padStart(8, '0')
          .replace(/0+$/, '');
        setLbtcBalance(fraction ? `${whole}.${fraction}` : `${whole}`);
      } catch {
        setLbtcBalance(null);
      }
    };

    void fetchBalance();
  }, [evmAddress, env]);

  const {
    unstake,
    isInitializing,
    error: sdkError,
    txHash,
    status,
    reset,
  } = useEvmUnstaking(evmAddress, env);

  const handleStartUnstaking = async (formData: WithdrawFormData) => {
    setIsUnstaking(true);
    setSourceChain(formData.sourceChain);
    try {
      await unstake(formData);
    } catch (err) {
      console.error('Unstaking failed:', err);
      setIsUnstaking(false);
    }
  };

  const handleReset = () => {
    reset();
    setIsUnstaking(false);
    onReset?.();
  };

  return (
    <div className="py-8">
      <div className="container">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-4 text-primary">
              Unstake LBTC
            </h1>
            <p className="text-secondary text-lg">
              Burn LBTC to receive BTC or BTC.b using the Lombard SDK
            </p>
          </div>

          {/* Wallet Connection (required) */}
          <div className="mb-6">
            <WalletConnect />
            {!evmAddress && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-900">
                  ⚠️ EVM wallet connection is required to sign unstake
                  transactions
                </p>
              </div>
            )}
            {evmAddress && lbtcBalance !== null && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  LBTC Balance:{' '}
                  <span className="font-medium font-mono">{lbtcBalance}</span>{' '}
                  LBTC
                </p>
              </div>
            )}
          </div>

          {sdkError && (
            <div className="card mb-6 bg-red-50 border border-red-200">
              <h3 className="text-error font-semibold mb-2">SDK Error</h3>
              <p className="text-sm text-error">{sdkError}</p>
            </div>
          )}

          {!isUnstaking ? (
            <WithdrawForm
              env={env}
              onSubmit={handleStartUnstaking}
              isLoading={isInitializing}
              disabled={!evmAddress || isInitializing}
            />
          ) : (
            <WithdrawingProgress
              txHash={txHash}
              status={status}
              sourceChain={sourceChain}
              onReset={handleReset}
            />
          )}
        </div>
      </div>
    </div>
  );
}
