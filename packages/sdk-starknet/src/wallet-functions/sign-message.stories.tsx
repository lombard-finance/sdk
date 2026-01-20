import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';

import { Button } from '../stories/components/Button';
import { CodeBlock } from '../stories/components/CodeBlock';
import { ConnectButton } from '../stories/components/ConnectButton';
import { functionType } from '../stories/components/decorators';
import { starknetContext } from '../stories/components/decorators/starknet-context';
import { useConnection } from '../stories/hooks/use-connection';
import useQuery from '../stories/hooks/use-query';
import { makeDestinationChainId,StarknetChainId } from '../utils/chains';
import { signMessage } from './sign-message';

const meta = {
  title: 'write/sign-message',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('write'), starknetContext()],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    message: `destination chain id is ${makeDestinationChainId(StarknetChainId.SN_SEPOLIA)}`,
    chainId: StarknetChainId.SN_SEPOLIA,
  },
};

type FuncParameters = Parameters<typeof signMessage>[0];
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

    return signMessage({
      walletAccount: account,
      ...props,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <div className="mb-4">
        <ConnectButton desiredChainId={props.chainId} />
      </div>

      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={signMessage.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
