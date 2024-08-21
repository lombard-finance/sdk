import type { Meta, StoryObj } from '@storybook/react';
import { defaultEnv } from '../../common/const';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { exampleEvmAddress } from '../../stories/const';
import useQuery from '../../stories/hooks/useQuery';
import { fromCamelCase } from '../../stories/utils/fromCamelCase';
import {
  getDepositsByAddress,
  IGetDepositsByAddressParams,
} from './getDepositsByAddress';

const { name } = getDepositsByAddress;
const nameWithWhitespaces = fromCamelCase(name);

const meta = {
  title: 'SDK/getDepositsByAddress',
  component: StoryView,
  tags: ['autodocs'],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    address: exampleEvmAddress,
    env: defaultEnv,
  },
};

export function StoryView(props: IGetDepositsByAddressParams) {
  const { data, error, isLoading, refetch } = useQuery(
    () => getDepositsByAddress(props),
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
