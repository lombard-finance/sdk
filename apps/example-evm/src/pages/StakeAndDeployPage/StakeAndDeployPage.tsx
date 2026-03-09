import { DeployProtocol, Env } from '@lombard.finance/sdk';
import { useState } from 'react';

import { StakeAndDeployForm } from '../../components/StakeAndDeployForm';
import { StakeAndDeployProgress } from '../../components/StakeAndDeployProgress';
import { WalletConnect } from '../../components/WalletConnect';
import { useEvmWallet } from '../../hooks/useEvmWallet';
import { useBtcStakeAndDeploy } from './useBtcStakeAndDeploy';

interface StakeAndDeployPageProps {
  env: Env;
}

function StakeAndDeployUnsupported() {
  return (
    <div className="py-8">
      <div className="container">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-4 text-primary">
              Stake-and-Deploy
            </h1>
            <p className="text-secondary text-lg">
              Stake BTC and automatically deposit LBTC to a DeFi vault
            </p>
          </div>

          <div className="card bg-amber-50 border border-amber-200 text-center">
            <p className="text-lg font-semibold text-amber-900 mb-2">
              Production Only
            </p>
            <p className="text-sm text-amber-800">
              Stake-and-Deploy is only available on the Production environment.
              Switch to Production using the environment selector in the sidebar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StakeAndDeployPage({ env }: StakeAndDeployPageProps) {
  if (env !== Env.prod) {
    return <StakeAndDeployUnsupported />;
  }

  return <StakeAndDeployPageInner env={env} />;
}

function StakeAndDeployPageInner({ env }: StakeAndDeployPageProps) {
  const [isStaking, setIsStaking] = useState(false);
  const { isConnected } = useEvmWallet();
  const [partnerId, setPartnerIdState] = useState(
    () => localStorage.getItem('lombard-partnerId') || '',
  );
  const [protocol] = useState<DeployProtocol>(DeployProtocol.Veda);

  const setPartnerId = (value: string) => {
    setPartnerIdState(value);
    localStorage.setItem('lombard-partnerId', value);
  };

  const {
    stakeAndDeploy,
    isInitializing,
    error: sdkError,
    depositAddress,
    stakeAmount,
    status,
    progress,
    reset,
  } = useBtcStakeAndDeploy(protocol, partnerId, env);

  const chainLabels: Record<string, string> = {
    'eip155:1': 'Ethereum',
    'eip155:8453': 'Base',
    'eip155:56': 'BNB Chain',
    'eip155:17000': 'Holesky',
    'eip155:84532': 'Base Sepolia',
    'eip155:97': 'BNB Testnet',
  };

  const handleStartStaking = async (data: {
    amount: string;
    recipient: string;
    destChain: string;
    protocol: DeployProtocol;
    referralCode?: string;
  }) => {
    setIsStaking(true);
    try {
      await stakeAndDeploy(data as Parameters<typeof stakeAndDeploy>[0]);
    } catch (err) {
      console.error('Stake-and-Deploy failed:', err);
      setIsStaking(false);
    }
  };

  const handleReset = () => {
    reset();
    setIsStaking(false);
  };

  return (
    <div className="py-8">
      <div className="container">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-4 text-primary">
              Stake-and-Deploy
            </h1>
            <p className="text-secondary text-lg">
              Stake BTC and auto-deposit LBTC to a DeFi vault
            </p>
          </div>

          {/* Wallet Connection */}
          <div className="mb-6">
            <WalletConnect />
          </div>

          {/* Partner ID Configuration */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <label
              htmlFor="partnerId"
              className="block text-sm font-medium mb-2 text-amber-900"
            >
              Partner ID (Required)
            </label>
            <input
              id="partnerId"
              type="text"
              value={partnerId}
              onChange={e => setPartnerId(e.target.value)}
              placeholder="Enter your partner ID"
              className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-capital-green bg-white"
              disabled={isStaking}
            />
            <p className="text-xs text-amber-700 mt-1">
              Without a Partner ID, deposit address generation requires
              reCAPTCHA, which is not integrated in this example. Contact
              Lombard Finance to obtain one.
            </p>
          </div>

          {sdkError && (
            <div className="card mb-6 bg-red-50 border border-red-200">
              <h3 className="text-error font-semibold mb-2">SDK Error</h3>
              <p className="text-sm text-error">{sdkError}</p>
            </div>
          )}

          {!isStaking ? (
            <StakeAndDeployForm
              onSubmit={handleStartStaking}
              isLoading={isInitializing}
              disabled={!partnerId || isInitializing}
              isWalletConnected={isConnected}
            />
          ) : (
            <StakeAndDeployProgress
              status={status}
              depositAddress={depositAddress}
              amount={stakeAmount}
              progress={progress}
              onReset={handleReset}
              protocol={protocol}
              targetChain={chainLabels[String(status)] || ''}
            />
          )}
        </div>
      </div>
    </div>
  );
}
