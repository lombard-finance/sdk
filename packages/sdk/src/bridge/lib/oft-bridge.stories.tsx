import type { Meta, StoryObj } from '@storybook/react';
import { ChainId } from '../../common/chains';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { ConnectButton } from '../../stories/components/ConnectButton';
import {
  functionType,
  wagmiDecorator,
} from '../../stories/components/decorators';
import { ErrorBlock } from '../../stories/components/error-block';
import {
  canPerformAction,
  useConnection,
} from '../../stories/hooks/useConnection';
import useQuery from '../../stories/hooks/useQuery';
import { OFT_BRIDGE_CHAINS } from './config';
import { BridgeOFTParameters, bridgeOFT } from './oft-bridge';

const meta = {
  title: 'bridge/bridgeOFT',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [wagmiDecorator, functionType('write')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    to: ChainId.corn,
    amount: '0.0001',
    approve: true,
    env: 'prod',
  },
  argTypes: {
    to: {
      mapping: ChainId,
      options: OFT_BRIDGE_CHAINS.map(
        ch => Object.entries(ChainId).find(([, v]) => v === ch)?.[0],
      ),
      control: { type: 'select' },
    },
  },
};

type Props = Omit<BridgeOFTParameters, 'account' | 'chainId' | 'provider'>;

export function StoryView(props: Props) {
  const connection = useConnection();

  const request = async () => {
    if (!canPerformAction(connection)) {
      return;
    }

    return bridgeOFT({
      ...props,

      account: connection.account.address,
      chainId: connection.account.chainId,
      provider: connection.provider,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <p>This method bridges funds between chains.</p>

      <div className="mb-4">
        <ConnectButton />
      </div>

      <Button
        onClick={refetch}
        disabled={isLoading || !canPerformAction(connection)}
        isLoading={isLoading}
        actionName={bridgeOFT.name}
      />

      <ErrorBlock>{error}</ErrorBlock>

      <CodeBlock text={data} />
    </>
  );
}
