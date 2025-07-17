import { Env } from '@lombard.finance/sdk-common';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import {
  functionType,
  wagmiDecorator,
} from '../../stories/components/decorators';
import { ErrorBlock } from '../../stories/components/error-block';
import { EXAMPLE_EVM_ADDRESS } from '../../stories/constants';
import useQuery from '../../stories/hooks/useQuery';
import {
  GetRewardBalancesParameters,
  getRewardBalances,
} from './get-reward-balances';
import { RewardToken } from './reward-tokens';

const meta = {
  title: 'rewards/getRewardBalances',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [wagmiDecorator, functionType('api-get')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    address: EXAMPLE_EVM_ADDRESS,
    rewardToken: RewardToken.BABY,
    env: Env.stage,
  },
};

type Props = GetRewardBalancesParameters;

export function StoryView(props: Props) {
  const request = async () => {
    return getRewardBalances({
      ...props,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <p>This function gets the rewards earned by a user.</p>

      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getRewardBalances.name}
      />

      <ErrorBlock>{error}</ErrorBlock>

      <CodeBlock text={data} />
    </>
  );
}
