import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState } from 'react';

import {
  Button,
  ConnectButton,
  ErrorDisplay,
  ResultDisplay,
} from '../../stories/components';
import { functionType } from '../../stories/decorators/function-type';
import { useConnect } from '../../stories/hooks/useConnect';
import useQuery from '../../stories/hooks/useQuery';
import { SolanaSdkError } from '../../utils/errors';
import { signMessage } from './signMessage';

type SignMessageProps = {
  message: string;
};

export function StoryView(props: SignMessageProps) {
  const {
    data: connectionData,
    error: connectError,
    isLoading: isConnecting,
    connect,
    disconnect,
  } = useConnect();
  const isConnected = !!connectionData;
  const provider = connectionData?.provider;

  const [message, setMessage] = useState<string>(props.message || '');

  useEffect(() => {
    setMessage(props.message || '');
  }, [props.message]);

  const request = async () => {
    if (!provider)
      throw new Error('Wallet not connected or provider unavailable.');
    if (!message) throw new Error('Message cannot be empty.');

    try {
      const result = await signMessage(provider, message);
      return result.signature;
    } catch (err: unknown) {
      console.error('Sign Message Error:', err);
      throw err instanceof Error ? err : SolanaSdkError.wrap(err);
    }
  };

  const {
    data: signature,
    error: fetchError,
    isLoading,
    refetch: handleSignMessage,
  } = useQuery(request, [provider, message], false);

  const isSignButtonDisabled = isLoading || !message || !isConnected;
  const error = fetchError || connectError;

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
      />

      <div className="d-grid gap-2 my-4">
        <Button
          primary
          size="large"
          onClick={handleSignMessage}
          isLoading={isLoading}
          disabled={isSignButtonDisabled}
          actionName={signMessage.name}
        />
      </div>

      {signature && (
        <ResultDisplay result={signature} title="Signature Result" />
      )}
      {error && <ErrorDisplay error={error} title="Error" />}
      {!isConnected && (
        <p className="mt-3 text-warning">Connect wallet to sign message.</p>
      )}
    </>
  );
}

const meta: Meta<typeof StoryView> = {
  title: 'write/signMessage',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('write')],
  parameters: {
    docs: {
      description: {
        component:
          'Demonstrates signing an arbitrary message using the `signMessage` SDK function.',
      },
    },
  },
  args: {
    message: 'Hello from Lombard! Please sign this message.',
  },
  argTypes: {
    message: { control: { type: 'text' } },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;
