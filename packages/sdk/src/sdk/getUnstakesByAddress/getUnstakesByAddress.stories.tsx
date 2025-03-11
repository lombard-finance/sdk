import type { Meta, StoryObj } from '@storybook/react';
import { defaultEnv } from '@lombard.finance/sdk-common';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { exampleEvmAddress } from '../../stories/const';
import useQuery from '../../stories/hooks/useQuery';
import { fromCamelCase } from '../../stories/utils/fromCamelCase';
import {
  getUnstakesByAddress,
  IGetUnstakesByAddressParameters,
} from './getUnstakesByAddress';

const { name } = getUnstakesByAddress;
const nameWithWhitespaces = fromCamelCase(name);

const meta = {
  title: 'SDK/getUnstakesByAddress',
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

export function StoryView(parameters: IGetUnstakesByAddressParameters) {
  const { data, error, isLoading, refetch } = useQuery(
    () => getUnstakesByAddress(parameters),
    [parameters],
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
