import type { Meta, StoryObj } from '@storybook/react';
import {
  functionType,
  wagmiDecorator,
} from '../../stories/components/decorators';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { ErrorBlock } from '../../stories/components/error-block';
import useQuery from '../../stories/hooks/useQuery';
import { RewardToken } from './reward-tokens';
import { Env } from '@lombard.finance/sdk-common';
import { claimReward, ClaimRewardParameters } from './claim-reward';
import { ConnectButton } from '../../stories/components/ConnectButton';
import {
  canPerformAction,
  useConnection,
} from '../../stories/hooks/useConnection';
import { ChainId } from '../../common/chains';
import { EXAMPLE_BABYLON_ADDRESS } from '../../stories/constants';

const meta = {
  title: 'rewards/claimReward',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [wagmiDecorator, functionType('write')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    to: EXAMPLE_BABYLON_ADDRESS,
    amount: '0.001',
    rewardToken: RewardToken.BABY,
    signingDataVariant: 'json',
    chainId: ChainId.ethereum,
    env: Env.stage,
  },
};

type Props = Omit<ClaimRewardParameters, 'account' | 'provider'>;

export function StoryView(props: Props) {
  const connection = useConnection();

  const request = async () => {
    if (!canPerformAction(connection)) {
      alert('Please connect');
      return;
    }

    return claimReward({
      account: connection.account.address,
      provider: connection.provider,
      ...props,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <p>This function claims a reward earned by a user.</p>

      <div className="mb-4">
        <ConnectButton />
      </div>

      <Button
        onClick={refetch}
        disabled={isLoading || !canPerformAction(connection)}
        isLoading={isLoading}
        actionName={claimReward.name}
      />

      <ErrorBlock>{error}</ErrorBlock>

      <CodeBlock text={data} />
    </>
  );
}
