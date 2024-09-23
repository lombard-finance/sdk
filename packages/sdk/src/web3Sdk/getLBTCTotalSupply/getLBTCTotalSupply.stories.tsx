import type { Meta, StoryObj } from '@storybook/react';
import { defaultEnv } from '../../common/const';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { useConnect } from '../../stories/hooks/useConnect';
import useQuery from '../../stories/hooks/useQuery';
import {
  getLBTCTotalSupply,
  ILBTCTotalSupplyParams,
} from './getLBTCTotalSupply';

const meta = {
  title: 'Web3SDK/getLBTCTotalSupply',
  component: StoryView,
  tags: ['autodocs'],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    env: defaultEnv,
  },
};

type TotalSupplyLBTCProps = Pick<ILBTCTotalSupplyParams, 'env'>;

export function StoryView(props: TotalSupplyLBTCProps) {

  const { data: connectData, error: connectError } = useConnect();

  const request = async () => {
    return getLBTCTotalSupply({
      chainId: 1,
      rpcUrl: 'https://rpc.ankr.com/eth',
      ...props,
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
        <CodeBlock text={connectError || formattedConnectData} />
      </div>
      <Button onClick={refetch} disabled={isLoading} isLoading={isLoading}>
        Get Total LBTC Supply
      </Button>

      <CodeBlock text={error || data} />
    </>
  );
}
