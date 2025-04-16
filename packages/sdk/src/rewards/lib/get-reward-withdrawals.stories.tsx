import type { Meta, StoryObj } from '@storybook/react';
import {
  functionType,
  wagmiDecorator,
} from '../../stories/components/decorators';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { ErrorBlock } from '../../stories/components/error-block';
import { EXAMPLE_EVM_ADDRESS } from '../../stories/constants';
import useQuery from '../../stories/hooks/useQuery';
import { RewardToken } from './reward-tokens';
import { Env } from '@lombard.finance/sdk-common';
import { getRewardWithdrawals } from './get-reward-withdrawals';

const meta = {
  title: 'rewards/getRewardWithdrawals',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [wagmiDecorator, functionType('api-get')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    address: EXAMPLE_EVM_ADDRESS,
    env: Env.stage,
  },
};

type Props = Parameters<typeof getRewardWithdrawals>[0];

export function StoryView(props: Props) {
  const request = async () => {
    return getRewardWithdrawals({
      ...props,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <p>This function gets the reward withdrawal fee.</p>

      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getRewardWithdrawals.name}
      />

      <ErrorBlock>{error}</ErrorBlock>

      <CodeBlock text={data} />
    </>
  );
}
