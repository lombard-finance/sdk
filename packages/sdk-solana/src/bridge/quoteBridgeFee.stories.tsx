import { EndpointId } from '@layerzerolabs/lz-definitions';
import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useState } from 'react';
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
import { quoteBridgeFee } from './quoteBridgeFee';

interface QuoteBridgeFeeStoryArgs {
  network: SolanaNetwork;
  amount: string;
  recipientAddress: string;
}

export const StoryView = ({
  network,
  amount,
  recipientAddress,
}: QuoteBridgeFeeStoryArgs) => {
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

  const destinationEid =
    network === SolanaNetwork.mainnet
      ? EndpointId.ETHEREUM_V2_MAINNET
      : EndpointId.SEPOLIA_V2_TESTNET;
  const destinationEidName =
    network === SolanaNetwork.mainnet ? 'Ethereum Mainnet' : 'Sepolia Testnet';

  const request = async () => {
    if (!provider?.publicKey) throw new Error('Wallet not connected.');
    if (!tokenMint)
      throw new Error('LBTC Token address not loaded for network.');
    if (!amount || !recipientAddress || !destinationEid)
      throw new Error('Missing Amount or Recipient Address.');

    const destEidNum = Number.parseInt(destinationEid.toString(), 10);
    if (
      Number.isNaN(destEidNum) ||
      !Object.values(EndpointId).includes(destEidNum as EndpointId)
    ) {
      throw new Error('Invalid LayerZero Endpoint ID');
    }
    const amountSats = Math.round(Number.parseFloat(amount) * 10 ** 8);
    if (Number.isNaN(amountSats) || amountSats <= 0) {
      throw new Error('Invalid amount.');
    }

    try {
      const quote = await quoteBridgeFee({
        env: networkToEnv[network as keyof typeof networkToEnv],
        provider,
        sendParams: {
          dstEid: destEidNum,
          to: recipientAddress,
          amountLD: amountSats,
          minAmountLD: amountSats,
          extraOptions: '',
          composeMsg: '',
          oftCmd: '',
        },
      });
      return `Native Fee: ${quote.nativeFee} lamports\nLZ Token Fee: ${quote.lzTokenFee}`;
    } catch (err) {
      console.error('Quote Error:', err);
      throw err;
    }
  };

  const {
    data: quoteResult,
    error: fetchError,
    isLoading: isQuoteLoading,
    refetch: handleQuote,
  } = useQuery(
    request,
    [provider, network, tokenMint, amount, recipientAddress, destinationEid],
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

      {isConnected && (
        <>
          <div className="d-grid gap-2 mt-3">
            <Button
              primary
              onClick={handleQuote}
              isLoading={isQuoteLoading}
              actionName={quoteBridgeFee.name}
            />
          </div>

          {quoteResult && (
            <ResultDisplay result={quoteResult} title="Quote Result" />
          )}
          {error && <ErrorDisplay error={error} title="Error" />}
          {!isConnected && (
            <p className="mt-3 text-warning">Connect wallet to quote fees.</p>
          )}
        </>
      )}
    </>
  );
};

const meta: Meta<typeof StoryView> = {
  title: 'read/quoteBridgeFee',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('read')],
  parameters: {
    docs: {
      description: {
        component:
          'Demonstrates quoting LayerZero bridge fees using `quoteBridgeFee`. Network and other params are controlled by args.',
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
