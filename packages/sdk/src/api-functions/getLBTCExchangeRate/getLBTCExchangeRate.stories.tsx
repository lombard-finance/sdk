import type { Meta, StoryObj } from '@storybook/react';
import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import { ChainId } from '../../common/chains';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import useQuery from '../../stories/hooks/useQuery';
import {
  getLBTCExchangeRate,
  IgetLBTCExchangeRateParams,
} from './getLBTCExchangeRate';
import { toSatoshi } from '../../utils/satoshi';
import { functionType } from '../../stories/components/decorators';

const meta = {
  title: 'api/getLBTCExchangeRate',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('api-get')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithDefaults: Story = {
  args: {
    amount: toSatoshi(1),
    chainId: ChainId.ethereum,
    env: DEFAULT_ENV,
  },
};

export function StoryView(props: IgetLBTCExchangeRateParams) {
  const { data, error, isLoading, refetch } = useQuery(
    async () => await getLBTCExchangeRate(props),
    [props],
    false,
  );

  return (
    <>
      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getLBTCExchangeRate.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
