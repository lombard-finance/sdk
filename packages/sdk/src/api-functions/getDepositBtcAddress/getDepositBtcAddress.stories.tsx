import type { Meta, StoryObj } from '@storybook/react';
import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import { ChainId } from '../../common/chains';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { EXAMPLE_EVM_ADDRESS } from '../../stories/constants';
import useQuery from '../../stories/hooks/useQuery';
import {
  getDepositBtcAddress,
  IGetDepositBtcAddressParameters,
} from './getDepositBtcAddress';
import { functionType } from '../../stories/components/decorators';

const meta = {
  title: 'api/getDepositBtcAddress',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('api-get')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    address: EXAMPLE_EVM_ADDRESS,
    chainId: ChainId.ethereum,
    env: DEFAULT_ENV,
    partnerId: 'lombard',
  },
  argTypes: {
    chainId: {
      mapping: ChainId,
      options: Object.keys(ChainId),
      description: 'The chain',
      control: { type: 'select' },
    },
  },
};

export function StoryView(props: IGetDepositBtcAddressParameters) {
  const { data, error, isLoading, refetch } = useQuery(
    () => getDepositBtcAddress(props),
    [props],
    false,
  );

  return (
    <>
      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getDepositBtcAddress.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
