import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import {
  canPerformAction,
  useConnection,
} from '../../stories/hooks/useConnection';
import useQuery from '../../stories/hooks/useQuery';
import { signStakeAndBake, ISignStakeAndBakeParams } from './signStakeAndBake';
import { ConnectButton } from '../../stories/components/ConnectButton';
import {
  functionType,
  wagmiDecorator,
} from '../../stories/components/decorators';

const { name } = signStakeAndBake;

const meta = {
  title: 'write/signStakeAndBake',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [wagmiDecorator, functionType('write')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    value: '20000',
    expiry: 3600,
  },
};

type SignStakeAndBakeParams = Omit<
  ISignStakeAndBakeParams,
  'account' | 'chainId' | 'provider'
>;

export function StoryView(props: SignStakeAndBakeParams) {
  const connection = useConnection();

  const request = async () => {
    if (!canPerformAction(connection)) {
      alert('Not connected.');
      return;
    }

    return signStakeAndBake({
      value: props.value,
      expiry: props.expiry,

      account: connection.account.address,
      chainId: connection.account.chainId,
      provider: connection.provider,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <p>
        This function generates a signature that allows Lombard to claim
        specified amount of BTC deposited to the personal account and deposit
        that amount automatically to the DeFi vault.
      </p>

      <div className="mb-4">
        <ConnectButton />
      </div>

      <Button
        onClick={refetch}
        disabled={isLoading || !connection.account.address}
        isLoading={isLoading}
        actionName={signStakeAndBake.name}
      />

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
