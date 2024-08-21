import type { Meta, StoryObj } from '@storybook/react';
import { defaultEnv } from '../../common/const';
import { OChainId } from '../../common/types/types';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import useQuery from '../../stories/hooks/useQuery';
import {
  getLBTCExchageRate,
  IGetLBTCExchageRateParams,
} from './getLBTCExchageRate';

const meta = {
  title: 'SDK/getLBTCExchageRate',
  component: StoryView,
  tags: ['autodocs'],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    env: defaultEnv,
    amount: 1,
    chainId: OChainId.holesky,
  },
};

export function StoryView(props: IGetLBTCExchageRateParams) {
  const { data, error, isLoading, refetch } = useQuery(
    () => getLBTCExchageRate(props),
    [props],
    false,
  );

  return (
    <>
      <Button onClick={refetch} disabled={isLoading} isLoading={isLoading}>
        Get LBTC Exchange Rate
      </Button>

      <CodeBlock text={error || data} />
    </>
  );
}
