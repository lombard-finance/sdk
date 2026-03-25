import type { Meta, StoryObj } from '@storybook/react';

import {
  Button,
  ConnectButton,
  ErrorDisplay,
  ResultDisplay,
} from '../../stories/components';
import { functionType } from '../../stories/decorators/function-type';
import { useConnect } from '../../stories/hooks/useConnect';
import useQuery from '../../stories/hooks/useQuery';
import { SolanaNetwork } from '../../types';
import { unstakeLBTC } from './unstakeLBTC';

interface UnstakeLbtcStoryArgs {
  network: SolanaNetwork;
  amountSats: string;
  btcAddress: string;
}

const DEFAULT_AMOUNT_SATS = '22000';

export const StoryView = ({
  network,
  amountSats,
  btcAddress,
}: UnstakeLbtcStoryArgs) => {
  const {
    data: connectionData,
    error: connectError,
    isLoading: isConnecting,
    connect,
    disconnect,
  } = useConnect();
  const isConnected = !!connectionData;
  const address = connectionData?.address;
  const provider = connectionData?.provider;

  const request = async () => {
    if (!provider || !address) throw new Error('Wallet not connected.');
    if (!btcAddress)
      throw new Error('Destination Bitcoin address is required (set in args).');
    if (!amountSats || !/^[1-9]\d*$/.test(amountSats))
      throw new Error(
        'Amount must be a positive integer in satoshis (set in args).',
      );

    const result = await unstakeLBTC(provider, {
      amount: amountSats,
      btcAddress,
      network: network,
    });
    return result;
  };

  const {
    data: txHash,
    error,
    isLoading,
    refetch: handleUnstake,
  } = useQuery(
    request,
    [provider, address, amountSats, btcAddress, network],
    false,
  );

  return (
    <>
      <ConnectButton
        connect={connect}
        disconnect={disconnect}
        isConnected={isConnected}
        isLoading={isConnecting}
        error={connectError}
        walletName={connectionData?.walletName}
        address={connectionData?.address}
        network={network}
      />

      {isConnected && (
        <>
          <div className="d-grid gap-2 my-4">
            <Button
              primary
              size="large"
              onClick={handleUnstake}
              isLoading={isLoading}
              actionName={unstakeLBTC.name}
            />
          </div>

          {txHash && (
            <ResultDisplay
              result={txHash}
              title="Unstake Transaction Hash"
              successMessage="Success! Unstake transaction submitted."
            />
          )}
          {(error || connectError) && (
            <ErrorDisplay error={error || connectError} title="Unstake Error" />
          )}
        </>
      )}
    </>
  );
};

const meta: Meta<typeof StoryView> = {
  title: 'write/unstakeLBTC',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('write')],
  parameters: {
    docs: {
      description: {
        component:
          'Deprecated: use `redeemForBtc` with LBTC `tokenMint` for Asset Router. Legacy demo of `unstakeLBTC` (LBTC program `redeem`). Requires amount in base units and destination Bitcoin address.',
      },
    },
  },
  args: {
    network: SolanaNetwork.devnet,
    amountSats: DEFAULT_AMOUNT_SATS,
    btcAddress: '',
  },
  argTypes: {
    network: {
      control: { type: 'select' },
      options: Object.values(SolanaNetwork),
    },
    amountSats: {
      control: { type: 'text' },
    },
    btcAddress: {
      control: { type: 'text' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;