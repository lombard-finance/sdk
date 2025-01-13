import type { Meta, StoryObj } from '@storybook/react';
import { defaultEnv } from '../../common/const';
import { OChainId } from '../../common/types/types';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import useQuery from '../../stories/hooks/useQuery';
import {
    getLBTCExchangeRate,
    IgetLBTCExchangeRateParams,
} from './getLBTCExchangeRate';

const meta = {
  title: 'SDK/getLBTCExchangeRate',
  component: StoryView,
  tags: ['autodocs'],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithDefaults: Story = {
  args: {
    env: defaultEnv,
    amount: 1,
    chainId: OChainId.ethereum,
  },
};

export function StoryView(props: IgetLBTCExchangeRateParams) {
  const { data, error, isLoading, refetch } = useQuery(
    () => getLBTCExchangeRate(props),
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
