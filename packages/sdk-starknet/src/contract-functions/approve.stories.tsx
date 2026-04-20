import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';

import { Button } from '../stories/components/Button';
import { CodeBlock } from '../stories/components/CodeBlock';
import { ConnectButton } from '../stories/components/ConnectButton';
import { functionType } from '../stories/components/decorators';
import { starknetContext } from '../stories/components/decorators/starknet-context';
import { useConnection } from '../stories/hooks/use-connection';
import useQuery from '../stories/hooks/use-query';
import { Token } from '../tokens/lib/tokens';
import { approve } from './approve';

const meta = {
  title: 'write/approve',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('write'), starknetContext()],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    amount: 1,
    spender:
      '0x07777d51699c68356c9dad77a56ac2fc90e03312f4afe554650791c379d6719d',
    token: Token.LBTC,
  },
};

type FuncParameters = Parameters<typeof approve>[0];
type Props = Omit<FuncParameters, 'walletAccount'>;

export function StoryView(props: Props) {
  const { account } = useConnection();

  useEffect(() => {
    console.log('s account', account);
  }, [account]);

  const request = async () => {
    if (!account) {
      console.info('Cannot perform action');
      return;
    }

    return approve({
      walletAccount: account,
      ...props,
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
        disabled={isLoading}
        isLoading={isLoading}
        actionName={approve.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
