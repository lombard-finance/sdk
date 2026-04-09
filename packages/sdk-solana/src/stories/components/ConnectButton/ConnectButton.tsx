import { useState } from "react";

import { SolanaNetwork } from "../../../types";
import { InjectedWallet } from "../../../types/walletProviders";
import { DEFAULT_WALLET, UseConnectResponse } from "../../hooks/useConnect";
import { Button } from "../Button/Button";
import { SectionCard } from "../index";

export const ConnectButton = ({
  connect,
  disconnect,
  isConnected,
  isLoading,
  error,
  walletName,
  address,
  network = SolanaNetwork.mainnet,
}: Pick<
  UseConnectResponse,
  "connect" | "disconnect" | "isConnected" | "isLoading" | "error"
> & {
  walletName?: string;
  address?: string;
  network?: SolanaNetwork;
}) => {
  const [selectedWallet, setSelectedWallet] =
    useState<InjectedWallet>(DEFAULT_WALLET);

  const handleConnect = () => {
    connect({ walletName: selectedWallet });
  };

  return (
    <SectionCard
      title={isConnected ? "Wallet Connected" : "Connect Wallet"}
      className="mb-4"
    >
      {!isConnected ? (
        <div className="container px-0">
          <div className="row gx-2 align-items-center">
            <div className="col">
              <select
                title="Select Wallet"
                className="form-select"
                onChange={(e) =>
                  setSelectedWallet(e.target.value as InjectedWallet)
                }
                value={selectedWallet}
                disabled={isLoading}
              >
                {Object.values(InjectedWallet).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
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
          {error && (
            <div className="alert alert-danger mt-2 mb-0">{error.message}</div>
          )}
        </div>
      ) : (
        <div className="container px-0">
          <div className="mb-3">
            <p className="mb-0">
              <strong>Wallet:</strong> {walletName}
            </p>
            <p className="mb-0">
              <strong>Address:</strong>{" "}
              <span className="text-monospace small">{address}</span>
            </p>
            <p className="mb-0">
              <strong>Network:</strong>{" "}
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
          {error && (
            <div className="alert alert-danger mt-2 mb-0">{error.message}</div>
          )}
        </div>
      )}
    </SectionCard>
  );
};
