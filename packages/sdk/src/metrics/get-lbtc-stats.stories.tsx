import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../stories/components/Button';
import { CodeBlock } from '../stories/components/CodeBlock';
import { functionType, wagmiDecorator } from '../stories/components/decorators';
import { ErrorBlock } from '../stories/components/error-block';
import useQuery from '../stories/hooks/useQuery';
import { getLBTCStats } from './get-lbtc-stats';
import { envSelector } from '../stories/arg-types';
import { DEFAULT_ENV } from '@lombard.finance/sdk-common';

const meta = {
  title: 'metrics/getLBTCStats',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [wagmiDecorator, functionType('api-get')],
  argTypes: { ...envSelector },
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    env: DEFAULT_ENV,
  },
};

type SignNetworkFeeProps = Parameters<typeof getLBTCStats>[0];

export function StoryView(props: SignNetworkFeeProps) {
  const request = async () => {
    return getLBTCStats({
      ...props,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <p>This function returns the total supply of the LBTC.</p>

      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getLBTCStats.name}
      />

      <ErrorBlock>{error}</ErrorBlock>

      <CodeBlock text={data} />
    </>
  );
}
