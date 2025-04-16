import type { Meta, StoryObj } from '@storybook/react';
import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import useQuery from '../../stories/hooks/useQuery';
import { IUnstakeLBTCParams, unstakeLBTC } from './unstakeLBTC';
import { ConnectButton } from '../../stories/components/ConnectButton';
import {
  canPerformAction,
  useConnection,
} from '../../stories/hooks/useConnection';
import {
  functionType,
  wagmiDecorator,
} from '../../stories/components/decorators';

const meta = {
  title: 'write/unstakeLBTC',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [wagmiDecorator, functionType('write')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    amount: 0.00001,
    btcAddress: '',
    env: DEFAULT_ENV,
  },
};

type ClaimLBTCProps = Pick<IUnstakeLBTCParams, 'btcAddress' | 'env' | 'amount'>;

export function StoryView(props: ClaimLBTCProps) {
  const connection = useConnection();

  const request = async () => {
    if (!canPerformAction(connection)) {
      alert('Not connected');
      return;
    }

    return unstakeLBTC({
      amount: props.amount,
      btcAddress: props.btcAddress,

      account: connection.account.address,
      chainId: connection.account.chainId,
      provider: connection.provider,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <p>
        This function unstakes the specified amount of LBTC and transfers the
        equivalent amount of BTC to the provided BTC address.
      </p>

      <div className="mb-4">
        <ConnectButton />
      </div>

      <Button
        onClick={refetch}
        disabled={isLoading || !connection.account.address}
        isLoading={isLoading}
        actionName={unstakeLBTC.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
