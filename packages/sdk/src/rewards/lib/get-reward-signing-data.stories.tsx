import type { Meta, StoryObj } from '@storybook/react';
import {
  functionType,
  wagmiDecorator,
} from '../../stories/components/decorators';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { ErrorBlock } from '../../stories/components/error-block';
import {
  EXAMPLE_BABYLON_ADDRESS,
  EXAMPLE_EVM_ADDRESS,
} from '../../stories/constants';
import useQuery from '../../stories/hooks/useQuery';
import { RewardToken } from './reward-tokens';
import { Env } from '@lombard.finance/sdk-common';
import { getRewardSigningData } from './get-reward-signing-data';
import { getRewardWithdrawalFee } from './get-reward-withdrawal-fee';

const meta = {
  title: 'rewards/getRewardSigningData',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [wagmiDecorator, functionType('api-get')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    from: EXAMPLE_EVM_ADDRESS,
    to: EXAMPLE_BABYLON_ADDRESS,
    amount: '0.001',
    fee: '0.00044',
    rewardToken: RewardToken.BABY,
    env: Env.stage,
  },
};

type Props = Parameters<typeof getRewardSigningData>[0];

export function StoryView(props: Props) {
  const request = async () => {
    return getRewardSigningData({
      ...props,
      fee: await getRewardWithdrawalFee({
        address: props.from,
        rewardToken: props.rewardToken,
        env: props.env,
      }),
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <p>
        This function gets the singing data (message) needed to be signed on
        claim.
      </p>

      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getRewardSigningData.name}
      />

      <ErrorBlock>{error}</ErrorBlock>

      <CodeBlock text={data} />
    </>
  );
}
