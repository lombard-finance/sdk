import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState } from 'react';

import { getLBTCAddress, networkToEnv } from '../const/getConfig';
import {
  Button,
  ConnectButton,
  ErrorDisplay,
  ResultDisplay,
} from '../stories/components';
import { functionType } from '../stories/decorators/function-type';
import { useConnect } from '../stories/hooks/useConnect';
import useQuery from '../stories/hooks/useQuery';
import { SolanaNetwork } from '../types';
import { sendBridgeTransaction } from './sendBridgeTransaction';

interface SendBridgeTransactionStoryArgs {
  network: SolanaNetwork;
  amount: string;
  recipientAddress: string;
}

export const StoryView = ({
  network,
  amount,
  recipientAddress,
}: SendBridgeTransactionStoryArgs) => {
  const {
    data: connectionData,
    error: connectError,
    isLoading: isConnecting,
    connect,
    disconnect,
  } = useConnect();
  const isConnected = !!connectionData;
  const provider = connectionData?.provider;

  const [tokenMint, setTokenMint] = useState<string>('');

  const destinationEid = network === SolanaNetwork.mainnet ? 30101 : 40161;

  useEffect(() => {
    setTokenMint('');
    if (!network) return;
    try {
      const lbtcAddress = getLBTCAddress(network);
      setTokenMint(lbtcAddress);
    } catch (err: unknown) {
      console.error('Could not get LBTC address for network:', network, err);
    }
  }, [network]);

  const request = async () => {
    if (!provider?.publicKey || !provider.signTransaction)
      throw new Error('Wallet not connected or does not support signing.');
    if (!tokenMint)
      throw new Error('LBTC Token address not loaded for this network.');
    if (!amount || !recipientAddress)
      throw new Error('Amount and Recipient Address are required.');

    const env = networkToEnv[network as keyof typeof networkToEnv];
    const parsedAmount = Number.parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0)
      throw new Error('Invalid amount specified.');

    try {
      const signature = await sendBridgeTransaction({
        provider,
        env,
        destinationLzEndpointId: destinationEid,
        amount,
        recipientAddress,
      });
      return signature;
    } catch (err) {
      console.error('Send Bridge Error:', err);
      throw err;
    }
  };

  const {
    data: txSignature,
    error: fetchError,
    isLoading: isSending,
    refetch: handleSend,
  } = useQuery(
    request,
    [provider, network, destinationEid, amount, recipientAddress, tokenMint],
    false,
  );

  const error = fetchError || connectError;

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

      <div className="mb-3 p-3 border rounded bg-light small">
        <p className="mb-1">
          <strong>Destination EID:</strong> {destinationEid}
        </p>
        <p className="mb-1">
          <strong>LBTC Mint:</strong> {tokenMint || 'Loading...'}
        </p>
        <p className="mb-1">
          <strong>Amount (from args):</strong> {amount} LBTC
        </p>
        <p className="mb-0">
          <strong>Recipient (from args):</strong>{' '}
          {recipientAddress || '(Not Set)'}
        </p>
      </div>

      <div className="d-grid gap-2 my-4">
        <Button
          primary
          size="large"
          onClick={handleSend}
          isLoading={isSending}
          disabled={
            isSending ||
            !amount ||
            !recipientAddress ||
            !tokenMint ||
            !isConnected
          }
          actionName={sendBridgeTransaction.name}
        />
      </div>

      {txSignature && (
        <ResultDisplay
          result={txSignature}
          title="Transaction Signature"
          successMessage="Bridge transaction sent!"
        />
      )}
      {error && <ErrorDisplay error={error} title="Error" />}
      {!isConnected && (
        <p className="mt-3 text-warning">Connect wallet to send transaction.</p>
      )}
    </>
  );
};

const meta: Meta<typeof StoryView> = {
  title: 'write/sendBridgeTransaction',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('write')],
  parameters: {
    docs: {
      description: {
        component:
          'Demonstrates sending an LBTC bridge transaction from Solana using `sendBridgeTransaction`.',
      },
    },
  },
  args: {
    network: SolanaNetwork.devnet,
    amount: '0.0001',
    recipientAddress: '',
  },
  argTypes: {
    network: {
      control: { type: 'select' },
      options: Object.values(SolanaNetwork),
    },
    amount: { control: { type: 'text' } },
    recipientAddress: { control: { type: 'text' } },
  },
};
export default meta;

type Story = StoryObj<typeof meta>;
