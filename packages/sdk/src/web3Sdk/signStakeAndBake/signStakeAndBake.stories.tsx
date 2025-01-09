import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import type { Meta } from '@storybook/react';
import { useState } from 'react';
import { OChainId } from '../../common/types/types';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { useConnect } from '../../stories/hooks/useConnect';
import useQuery from '../../stories/hooks/useQuery';
import { fromCamelCase } from '../../stories/utils/fromCamelCase';
import {
  getStakeAndBakeVaults,
  SUPPORTED_STAKE_AND_BAKE_CHAINS,
} from './contracts';
import { signStakeAndBake } from './signStakeAndBake';

const { name } = signStakeAndBake;
const nameWithWhitespaces = fromCamelCase(name);

const EXPIRY_OPTIONS = {
  '10 seconds': 10,
  '1 minute': 60,
  '1 hour': 3600,
  '1 day': 86400,
  '1 year': 31536000,
} as const;

type ExpiryOption = keyof typeof EXPIRY_OPTIONS;

const meta = {
  title: 'Web3SDK/signStakeAndBake',
  component: StoryView,
  tags: ['autodocs'],
} satisfies Meta<typeof StoryView>;

export default meta;

export function StoryView() {
  const [selectedExpiry, setSelectedExpiry] =
    useState<ExpiryOption>('10 seconds');
  const [selectedChain, setSelectedChain] = useState(OChainId.holesky);
  const vaults = getStakeAndBakeVaults(selectedChain);
  const [selectedVaultKey, setSelectedVaultKey] = useState(vaults[0].key);

  const {
    data: connectData,
    error: connectError,
    isLoading: isConnectLoading,
    connect,
  } = useConnect();

  const request = async () => {
    if (!connectData || !connectData.provider) {
      return;
    }

    const expiry =
      Math.floor(Date.now() / 1000) + EXPIRY_OPTIONS[selectedExpiry];

    return signStakeAndBake({
      provider: connectData.provider,
      address: connectData.account,
      chainId: selectedChain,
      value: '1999',
      expiry,
      vaultKey: selectedVaultKey,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(
    request,
    [selectedExpiry, selectedChain, selectedVaultKey],
    false,
  );

  const formattedConnectData = connectData && {
    account: connectData.account,
    chainId: connectData.chainId,
  };

  return (
    <>
      <p>
        This method is used to sign a permit for stake and bake operations. The
        signature is used to approve spending of tokens.
      </p>

      <div className="mb-4">
        <Button
          onClick={connect}
          disabled={isConnectLoading}
          isLoading={isConnectLoading}
        >
          Connect
        </Button>

        <CodeBlock text={connectError || formattedConnectData} />
      </div>

      <div className="mb-4">
        <FormControl fullWidth>
          <InputLabel id="chain-select-label">Chain</InputLabel>
          <Select
            labelId="chain-select-label"
            value={selectedChain}
            label="Chain"
            onChange={e => {
              const newChainId = Number(e.target.value) as typeof selectedChain;
              setSelectedChain(newChainId);
              // Reset vault selection to first vault of new chain
              const newVaults = getStakeAndBakeVaults(newChainId);
              setSelectedVaultKey(newVaults[0].key);
            }}
          >
            {SUPPORTED_STAKE_AND_BAKE_CHAINS.map(chainId => (
              <MenuItem key={chainId} value={chainId}>
                {chainId}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>

      <div className="mb-4">
        <FormControl fullWidth>
          <InputLabel id="vault-select-label">Vault</InputLabel>
          <Select
            labelId="vault-select-label"
            value={selectedVaultKey}
            label="Vault"
            onChange={e => setSelectedVaultKey(e.target.value)}
          >
            {vaults.map(vault => (
              <MenuItem key={vault.key} value={vault.key}>
                {vault.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>

      <div className="mb-4">
        <FormControl fullWidth>
          <InputLabel id="expiry-select-label">Expiry Time</InputLabel>
          <Select
            labelId="expiry-select-label"
            value={selectedExpiry}
            label="Expiry Time"
            onChange={e => setSelectedExpiry(e.target.value as ExpiryOption)}
          >
            {Object.keys(EXPIRY_OPTIONS).map(option => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>

      <Button
        onClick={refetch}
        disabled={
          isLoading || !connectData || connectData.chainId !== selectedChain
        }
        isLoading={isLoading}
      >
        {nameWithWhitespaces}
      </Button>

      <CodeBlock
        text={
          error ||
          (data && {
            ...data,
            signature: data.signature,
            typedData: data.typedData ? JSON.parse(data.typedData) : '',
          })
        }
      />
    </>
  );
}
