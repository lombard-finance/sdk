import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import type { Meta, StoryObj } from '@storybook/react';

import { makeTokenSelector } from '../../stories/arg-types';
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
import { Token } from '../../tokens/token-addresses';
import { depositToken } from './depositToken';

const meta = {
  title: 'write/depositToken',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [wagmiDecorator, functionType('write')],
  argTypes: {
    ...makeTokenSelector([Token.BTCK, Token.BTCb], 'tokenIn'),
    ...makeTokenSelector([Token.LBTC], 'tokenOut'),
  },
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    env: DEFAULT_ENV,
    amount: 0,
    tokenIn: Token.BTCb,
    tokenOut: Token.LBTC,
  },
};

type StoryProps = Omit<
  Parameters<typeof depositToken>[0],
  'account' | 'chainId' | 'provider'
>;

export function StoryView(props: StoryProps) {
  const connection = useConnection();

  const request = async () => {
    if (!canPerformAction(connection)) {
      return;
    }

    return depositToken({
      ...props,
      account: connection.account.address,
      chainId: connection.account.chainId,
      provider: connection.provider,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <div className="mb-4">
        <ConnectButton />
      </div>

      <Button
        onClick={refetch}
        disabled={isLoading || !connection.account.address}
        isLoading={isLoading}
        actionName={depositToken.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
