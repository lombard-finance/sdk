import type { Meta, StoryObj } from '@storybook/react';
import {
  Button,
  ConnectButton,
  ErrorDisplay,
  ResultDisplay,
} from '../../stories/components';
import { useConnect } from '../../stories/hooks/useConnect';
import { SolanaNetwork } from '../../types';
import { getBalance } from './getBalance';
import useQuery from '../../stories/hooks/useQuery';
import { functionType } from '../../stories/decorators/function-type';

const meta: Meta<typeof StoryView> = {
  title: 'read/getBalance',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('read')],
  parameters: {
    docs: {
      description: {
        component:
          'Demonstrates fetching SOL or SPL token balances using the `getBalance` SDK function.',
      },
    },
  },
  args: {
    network: SolanaNetwork.devnet,
    rpcUrl: '',
    tokenAddress: '',
  },
  argTypes: {
    network: {
      control: { type: 'select' },
      options: Object.values(SolanaNetwork),
    },
    rpcUrl: { control: { type: 'text' }, name: 'RPC URL (Optional)' },
    tokenAddress: {
      control: { type: 'text' },
      name: 'Token Address (Optional, blank for SOL)',
    },
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

interface GetBalanceStoryArgs {
  network: SolanaNetwork;
  rpcUrl?: string;
  tokenAddress?: string;
}

export function StoryView({
  network,
  rpcUrl,
  tokenAddress,
}: GetBalanceStoryArgs) {
  const {
    data: connectionData,
    error: connectError,
    isLoading: isConnecting,
    connect,
    disconnect,
  } = useConnect();
  const isConnected = !!connectionData;
  const address = connectionData?.address;

  const request = async () => {
    if (!address) {
      throw new Error('Wallet not connected.');
    }
    try {
      const result = await getBalance({
        publicKey: address,
        network,
        rpcUrl: rpcUrl || undefined,
        tokenAddress: tokenAddress || undefined,
      });
      return result;
    } catch (error) {
      console.error('Balance fetch error:', error);
      throw error;
    }
  };

  const {
    data: balanceResult,
    error: fetchError,
    isLoading,
    refetch,
  } = useQuery(request, [address, network, rpcUrl, tokenAddress], false);

  const displayToken = tokenAddress || 'SOL (Native)';

  const error = fetchError || connectError;

  console.log({
    isLoading,
    isConnected,
    balanceResult,
    connectionData,
  });

  return (
    <>
      <ConnectButton
        connect={connect}
        disconnect={disconnect}
        isConnected={isConnected}
        isLoading={isConnecting}
        error={connectError}
        network={network}
        walletName={connectionData?.walletName}
        address={connectionData?.address}
      />

      <div className="d-grid gap-2 my-4">
        <Button
          primary
          size="large"
          onClick={refetch}
          isLoading={isLoading}
          disabled={isLoading || !isConnected}
          actionName={getBalance.name}
        />
      </div>

      {balanceResult && (
        <ResultDisplay
          result={balanceResult}
          title={`Balance (${displayToken})`}
          isJson
        />
      )}
      {error && <ErrorDisplay error={error} title="Fetch Error" />}
      {!isConnected && (
        <p className="mt-3 text-warning">Connect wallet to fetch balance.</p>
      )}
    </>
  );
}
