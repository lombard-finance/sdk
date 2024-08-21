import type { Meta, StoryObj } from '@storybook/react';
import { defaultEnv } from '../../common/const';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { useConnect } from '../../stories/hooks/useConnect';
import useQuery from '../../stories/hooks/useQuery';
import { approveLBTC, IApproveLBTCParams } from './approveLBTC';

const meta = {
  title: 'Web3SDK/approveLBTC',
  component: StoryView,
  tags: ['autodocs'],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    amount: 0.00001,
    spender: '',
    env: defaultEnv,
  },
};

type ClaimLBTCProps = Pick<IApproveLBTCParams, 'spender' | 'amount' | 'env'>;

export function StoryView(props: ClaimLBTCProps) {
  const {
    data: connectData,
    error: connectError,
    isLoading: isConnectLoading,
    connect,
  } = useConnect();

  const request = async () => {
    if (!connectData) {
      return;
    }

    return approveLBTC({ ...connectData, ...props });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  const formattedConnectData = connectData && {
    account: connectData.account,
    chainId: connectData.chainId,
  };

  return (
    <>
      <div className="mb-4">
        <Button
          onClick={connect}
          disabled={isConnectLoading}
          isLoading={isConnectLoading}
        >
          Connect
        </Button>

        <CodeBlock text={connectError || formattedConnectData} />
      </div>

      <Button
        onClick={refetch}
        disabled={isLoading || !connectData}
        isLoading={isLoading}
      >
        Approve LBTC
      </Button>

      <CodeBlock text={error || data} />
    </>
  );
}
