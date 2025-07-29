import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../stories/components/Button';
import { CodeBlock } from '../stories/components/CodeBlock';
import useQuery from '../stories/hooks/useQuery';
import { functionType, wagmiDecorator } from '../stories/components/decorators';
import { ErrorBlock } from '../stories/components/error-block';
import { getPositionsSummary } from './get-positions-summary';
import { EXAMPLE_EVM_ADDRESS } from '../stories/constants';
import { envSelector } from '../stories/arg-types';
import { Env } from '@lombard.finance/sdk-common';

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
