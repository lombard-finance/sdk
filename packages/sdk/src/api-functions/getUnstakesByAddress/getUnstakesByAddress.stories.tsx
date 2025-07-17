import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { functionType } from '../../stories/components/decorators';
import { EXAMPLE_EVM_ADDRESS } from '../../stories/constants';
import useQuery from '../../stories/hooks/useQuery';
import {
  IGetUnstakesByAddressParameters,
  getUnstakesByAddress,
} from './getUnstakesByAddress';

const meta = {
  title: 'api/getUnstakesByAddress',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('api-get')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    address: EXAMPLE_EVM_ADDRESS,
    env: DEFAULT_ENV,
  },
};

export function StoryView(parameters: IGetUnstakesByAddressParameters) {
  const { data, error, isLoading, refetch } = useQuery(
    async () => await getUnstakesByAddress(parameters),
    [parameters],
    false,
  );

  return (
    <>
      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getUnstakesByAddress.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
