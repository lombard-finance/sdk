import type { Meta, StoryObj } from '@storybook/react';
import { defaultEnv } from '@lombard.finance/sdk-common';
import { OChainId } from '../../common/types/types';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { exampleEvmAddress } from '../../stories/const';
import useQuery from '../../stories/hooks/useQuery';
import { fromCamelCase } from '../../stories/utils/fromCamelCase';
import {
  getDepositBtcAddresses,
  IGetDepositBtcAddressesParameters,
} from './getDepositBtcAddress';

const { name } = getDepositBtcAddresses;
const nameWithWhitespaces = fromCamelCase(name);

const meta = {
  title: 'SDK/getDepositBtcAddresses',
  component: StoryView,
  tags: ['autodocs'],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    address: exampleEvmAddress,
    chainId: OChainId.ethereum,
    env: defaultEnv,
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
      <Button onClick={refetch} disabled={isLoading} isLoading={isLoading}>
        {nameWithWhitespaces}
      </Button>

      <CodeBlock text={error || data} />
    </>
  );
}
