import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import useQuery from '../../stories/hooks/useQuery';
import {
  getBasculeDepositStatus,
  IGetBasculeDepositStatusParameters,
} from './getBasculeDepositStatus';
import { ChainId } from '../../common/chains';
import { functionType } from '../../stories/components/decorators';

const meta = {
  title: 'read/getBasculeDepositStatus',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('read')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    rawPayload:
      'f2e73f7c00000000000000000000000000000000000000000000000000000000000000010000000000000000000000004f3128be175467a35ec1f430264cbc36ab272f83000000000000000000000000000000000000000000000000000000000000c3500c870b82581beb090f8ee4e6a36ece9ea67df8d993c0962dd25e650d46f824bc0000000000000000000000000000000000000000000000000000000000000003',
    chainId: ChainId.ethereum,
  },
};

export function StoryView(props: IGetBasculeDepositStatusParameters) {
  const request = async () => {
    return getBasculeDepositStatus(props);
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getBasculeDepositStatus.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
