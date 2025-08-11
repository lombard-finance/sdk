import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import type { Meta, StoryObj } from '@storybook/react';
import { ChainId } from '../../common/chains';
import { chainSelector } from '../../stories/arg-types';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { functionType } from '../../stories/components/decorators';
import { EXAMPLE_EVM_ADDRESS } from '../../stories/constants';
import useQuery from '../../stories/hooks/useQuery';
import { getDepositBtcAddresses } from './getDepositBtcAddress';
import { IGetDepositBtcAddressesParameters } from './types';

const meta = {
  title: 'api/getDepositBtcAddresses',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('api-get')],
  argTypes: {
    ...chainSelector,
  },
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    address: EXAMPLE_EVM_ADDRESS,
    chainId: ChainId.ethereum,
    env: DEFAULT_ENV,
    limit: 1,
    offset: 0,
    partnerId: 'lombard',
  },
};

export function StoryView(props: IGetDepositBtcAddressesParameters) {
  const { data, error, isLoading, refetch } = useQuery(
    () => getDepositBtcAddresses(props),
    [props],
    false,
  );

  return (
    <>
      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getDepositBtcAddresses.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
