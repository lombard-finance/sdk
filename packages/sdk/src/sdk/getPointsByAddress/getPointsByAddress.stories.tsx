import type { Meta, StoryObj } from '@storybook/react';
import { defaultEnv } from '@lombard.finance/sdk-common';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { exampleEvmAddress } from '../../stories/const';
import useQuery from '../../stories/hooks/useQuery';
import { fromCamelCase } from '../../stories/utils/fromCamelCase';
import {
  getPointsByAddress,
  IGetPointsByAddressParameters,
} from './getPointsByAddress';

const { name } = getPointsByAddress;
const nameWithWhitespaces = fromCamelCase(name);

const meta = {
  title: 'SDK/getPointsByAddress',
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

export function StoryView(props: IGetPointsByAddressParameters) {
  const { data, error, isLoading, refetch } = useQuery(
    () => getPointsByAddress(props),
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
