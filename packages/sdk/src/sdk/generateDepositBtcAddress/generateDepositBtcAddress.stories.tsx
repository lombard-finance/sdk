import type { Meta, StoryObj } from '@storybook/react';
import { defaultEnv } from '../../common/const';
import { OChainId } from '../../common/types/types';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { exampleEvmAddress } from '../../stories/const';
import useQuery from '../../stories/hooks/useQuery';
import { fromCamelCase } from '../../stories/utils/fromCamelCase';
import {
  generateDepositBtcAddress,
  IGenerateDepositBtcAddressParams,
} from './generateDepositBtcAddress';

const { name } = generateDepositBtcAddress;
const nameWithWhitespaces = fromCamelCase(name);

const meta = {
  title: 'SDK/generateDepositBtcAddress',
  component: StoryView,
  tags: ['autodocs'],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    address: exampleEvmAddress,
    chainId: OChainId.ethereum,
    signature: '',
    env: defaultEnv,
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
      <Button onClick={refetch} disabled={isLoading} isLoading={isLoading}>
        {nameWithWhitespaces}
      </Button>

      <CodeBlock text={error || data} />
    </>
  );
}
