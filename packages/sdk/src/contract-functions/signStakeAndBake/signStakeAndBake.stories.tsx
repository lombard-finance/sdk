import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { ConnectButton } from '../../stories/components/ConnectButton';
import {
  functionType,
  wagmiDecorator,
} from '../../stories/components/decorators';
import {
  canPerformAction,
  useConnection,
} from '../../stories/hooks/useConnection';
import useQuery from '../../stories/hooks/useQuery';
import { DAY, now, toUnix } from '../../utils/time';
import { ISignStakeAndBakeParams, signStakeAndBake } from './signStakeAndBake';
import { Token } from '../../tokens/token-addresses';

const meta = {
  title: 'write/signStakeAndBake',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [wagmiDecorator, functionType('write')],
  argTypes: {
    token: {
      mappping: {
        BTC: 'BTC',
        [Token.LBTC]: 'LBTC',
      },
      options: ['BTC', Token.LBTC],
      control: { type: 'select' },
    },
  },
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    value: '20000',
    expiry: toUnix(now() + DAY),
    token: 'BTC',
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
      token: props.token,

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
        specified amount of BTC and deposit the equivalent LBTC amount
        (calculated using current ratio) automatically to the DeFi vault.
      </p>
      <p>
        <strong>Note:</strong> You should pass the original BTC amount directly.
        The function automatically calculates the correct LBTC amount using the
        current exchange ratio.
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
