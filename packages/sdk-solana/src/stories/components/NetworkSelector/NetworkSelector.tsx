import React from 'react';

import { RPC_URLS } from '../../../const/rpcUrls';
import { SolanaNetwork } from '../../../types';
import { SelectField } from '../SelectField/SelectField';

interface NetworkSelectorProps {
  network: SolanaNetwork;
  setNetwork: (network: SolanaNetwork) => void;
  setCustomRpcUrl?: (url: string) => void; // Optional callback to clear custom RPC
  id?: string;
  label?: string;
  className?: string;
}

export const NetworkSelector: React.FC<NetworkSelectorProps> = ({
  network,
  setNetwork,
  setCustomRpcUrl,
  id = 'network-select',
  label = 'Network',
  className,
}) => {
  const networkOptions = Object.keys(RPC_URLS).map(net => ({
    value: net,
    label: net, // Consider using fromCamelCase for better display if needed
  }));

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newNetwork = e.target.value as SolanaNetwork;
    setNetwork(newNetwork);
    if (setCustomRpcUrl) {
      setCustomRpcUrl(''); // Clear custom RPC when network changes
    }
  };

  return (
    <SelectField
      id={id}
      label={label}
      value={network}
      onChange={handleChange}
      options={networkOptions}
      infoText={`Default RPC: ${RPC_URLS[network]}`}
      className={className}
      aria-label="Select Solana network"
    />
  );
};
