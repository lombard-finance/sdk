import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import type { Meta, StoryObj } from '@storybook/react';
import { ChainId } from '../../common/chains';
import { chainSelector, makeTokenSelector } from '../../stories/arg-types';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { functionType } from '../../stories/components/decorators';
import { EXAMPLE_EVM_ADDRESS } from '../../stories/constants';
import useQuery from '../../stories/hooks/useQuery';
import { Token } from '../../tokens/token-addresses';
import {
  IGetDepositBtcAddressParameters,
  getDepositBtcAddress,
} from './getDepositBtcAddress';

const meta = {
  title: 'api/getDepositBtcAddress',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('api-get')],
  argTypes: {
    ...chainSelector,
    ...makeTokenSelector([Token.LBTC, Token.BTCK]),
  },
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    token: Token.LBTC,
    address: EXAMPLE_EVM_ADDRESS,
    chainId: ChainId.ethereum,
    env: DEFAULT_ENV,
    partnerId: 'lombard',
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
