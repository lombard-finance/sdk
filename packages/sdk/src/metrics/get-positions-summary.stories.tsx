import { Env } from '@lombard.finance/sdk-common';
import type { Meta, StoryObj } from '@storybook/react';

import { envSelector } from '../stories/arg-types';
import { Button } from '../stories/components/Button';
import { CodeBlock } from '../stories/components/CodeBlock';
import { functionType, wagmiDecorator } from '../stories/components/decorators';
import { ErrorBlock } from '../stories/components/error-block';
import { EXAMPLE_EVM_ADDRESS } from '../stories/constants';
import useQuery from '../stories/hooks/useQuery';
import { getPositionsSummary } from './get-positions-summary';

const meta = {
  title: 'metrics/getPositionsSummary',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [wagmiDecorator, functionType('api-get')],
  argTypes: { ...envSelector },
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: { account: EXAMPLE_EVM_ADDRESS, env: Env.stage },
};

type SignNetworkFeeProps = Parameters<typeof getPositionsSummary>[0];

export function StoryView(props: SignNetworkFeeProps) {
  const request = async () => {
    return getPositionsSummary({
      ...props,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <p>
        This function returns the rewards info for provided account address.
      </p>

      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getPositionsSummary.name}
      />

      <ErrorBlock>{error}</ErrorBlock>

      <CodeBlock text={data} />
    </>
  );
}
