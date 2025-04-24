import React, { useState } from 'react';
import { DEFAULT_WALLET, UseConnectResponse } from '../../hooks/useConnect';
import { Button } from '../Button/Button';
import { SectionCard } from '../index';
import { WalletType } from '../../../types/walletProviders';
import { SolanaNetwork } from '../../../types';

export const ConnectButton = ({
  connect,
  disconnect,
  data,
  isLoading,
  error,
  network = SolanaNetwork.mainnet,
}: UseConnectResponse & { network?: SolanaNetwork }) => {
  const [selectedWallet, setSelectedWallet] =
    useState<WalletType>(DEFAULT_WALLET);

  const isConnected = !!data;

  const handleConnect = () => {
    connect({ walletName: selectedWallet });
  };

  const walletOptions = Object.values(WalletType).map(w => ({
    value: w,
    label: w.charAt(0).toUpperCase() + w.slice(1),
  }));

  return (
    <SectionCard
      title={isConnected ? 'Wallet Connected' : 'Connect Wallet'}
      className="mb-4"
    >
      {!isConnected ? (
        <div className="container px-0">
          <div className="row gx-2 align-items-center">
            <div className="col">
              <select
                title="Select Wallet"
                className="form-select"
                onChange={e => setSelectedWallet(e.target.value as WalletType)}
                value={selectedWallet}
                disabled={isLoading}
              >
                {walletOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-auto">
              <Button
                primary
                onClick={handleConnect}
                isLoading={isLoading}
                disabled={isLoading}
              >
                Connect
              </Button>
            </div>
          </div>
          {error && <div className="alert alert-danger mt-2 mb-0">{error}</div>}
        </div>
      ) : (
        <div className="container px-0">
          <div className="mb-3">
            <p className="mb-0">
              <strong>Wallet:</strong> {data.walletName}
            </p>
            <p className="mb-0">
              <strong>Address:</strong>{' '}
              <span className="text-monospace small">{data.address}</span>
            </p>
            <p className="mb-0">
              <strong>Network:</strong>{' '}
              <span className="text-monospace small">{network}</span>
            </p>
          </div>

          <div className="d-flex gap-2">
            <Button
              onClick={handleConnect}
              isLoading={isLoading}
              disabled={isLoading}
              size="small"
            >
              Reconnect
            </Button>
            <Button onClick={disconnect} disabled={isLoading} size="small">
              Disconnect
            </Button>
          </div>
          {error && <div className="alert alert-danger mt-2 mb-0">{error}</div>}
        </div>
      )}
    </SectionCard>
  );
};
