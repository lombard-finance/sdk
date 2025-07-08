import type { Meta, StoryObj } from '@storybook/react';
import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import {
  canPerformAction,
  useConnection,
} from '../../stories/hooks/useConnection';
import useQuery from '../../stories/hooks/useQuery';
import { mintToken } from './claimLBTC';
import {
  functionType,
  wagmiDecorator,
} from '../../stories/components/decorators';
import { ConnectButton } from '../../stories/components/ConnectButton';
import { Token } from '../../tokens/token-addresses';
import { makeTokenSelector } from '../../stories/arg-types';

const meta = {
  title: 'write/claimLBTC',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [wagmiDecorator, functionType('write')],
  argTypes: {
    ...makeTokenSelector([Token.LBTC, Token.BTCK]),
  },
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    proofSignature: '',
    data: '',
    env: DEFAULT_ENV,
    token: Token.LBTC,
  },
};

type ClaimLBTCProps = Omit<
  Parameters<typeof mintToken>[0],
  'account' | 'chainId' | 'provider'
>;

export function StoryView(props: ClaimLBTCProps) {
  const connection = useConnection();

  const request = async () => {
    if (!canPerformAction(connection)) {
      return;
    }

    return mintToken({
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
        actionName={mintToken.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
