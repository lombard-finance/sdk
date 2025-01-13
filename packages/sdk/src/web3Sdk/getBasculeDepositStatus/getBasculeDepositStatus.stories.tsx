import type { Meta, StoryObj } from '@storybook/react';
import { defaultEnv } from '../../common/const';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { useConnect } from '../../stories/hooks/useConnect';
import useQuery from '../../stories/hooks/useQuery';
import { getBasculeDepositStatus, ICheckBasculeDepositStatusParams } from './getBasculeDepositStatus';

const meta = {
  title: 'Web3SDK/getBasculeDepositStatus',
  component: StoryView,
  tags: ['autodocs'],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    rawPayload: '',
    env: defaultEnv,
  },
};

type CheckBasculeDepositStatusProps = Pick<
  ICheckBasculeDepositStatusParams,
  'env' | 'rawPayload'
>;

const BASCULE_DEPOSIT_TX_ID =
  '0x496028cda1ff940a1cfd9a326ac3bdff8e94ca545a6ac21d03964977561cbb52';

export function StoryView(props: CheckBasculeDepositStatusProps) {
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

    return getBasculeDepositStatus({
      ...connectData,
      ...props,
      rawPayload: BASCULE_DEPOSIT_TX_ID,
    });
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
        Get Bascule Deposit Status
      </Button>

      <CodeBlock text={error || data} />
    </>
  );
}
