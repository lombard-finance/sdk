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
  IGenerateDepositBtcAddressParams,
  generateDepositBtcAddress,
} from './generateDepositBtcAddress';

const meta = {
  title: 'api/generateDepositBtcAddress',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('api-post')],
  argTypes: {
    ...chainSelector,
    ...makeTokenSelector([Token.LBTC, Token.BTCK, Token.NativeLBTC]),
  },
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    address: EXAMPLE_EVM_ADDRESS,
    token: Token.LBTC,
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
