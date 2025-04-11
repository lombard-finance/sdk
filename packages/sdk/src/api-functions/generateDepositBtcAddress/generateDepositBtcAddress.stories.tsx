import type { Meta, StoryObj } from '@storybook/react';
import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import { ChainId } from '../../common/chains';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { EXAMPLE_EVM_ADDRESS } from '../../stories/constants';
import useQuery from '../../stories/hooks/useQuery';
import {
  generateDepositBtcAddress,
  IGenerateDepositBtcAddressParams,
} from './generateDepositBtcAddress';
import { functionType } from '../../stories/components/decorators';

const meta = {
  title: 'api/generateDepositBtcAddress',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('api-post')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    address: EXAMPLE_EVM_ADDRESS,
    chainId: ChainId.ethereum,
    signature: '',
    env: DEFAULT_ENV,
    referrerCode: 'lombard',
    partnerId: 'lombard',
  },
};

export function StoryView(props: IGenerateDepositBtcAddressParams) {
  const { data, error, isLoading, refetch } = useQuery(
    () => generateDepositBtcAddress(props),
    [props],
    false,
  );

  return (
    <>
      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={generateDepositBtcAddress.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
