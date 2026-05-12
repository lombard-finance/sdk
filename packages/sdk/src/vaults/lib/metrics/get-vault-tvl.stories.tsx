import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '../../../stories/components/Button';
import { CodeBlock } from '../../../stories/components/CodeBlock';
import {
  functionType,
  wagmiDecorator,
} from '../../../stories/components/decorators';
import { ErrorBlock } from '../../../stories/components/error-block';
import useQuery from '../../../stories/hooks/useQuery';
import { getEarnTVL, GetEarnTVLParameters } from './get-vault-tvl';

const meta = {
  title: 'vault/metrics/getEarnTVL',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [wagmiDecorator, functionType('api-get')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {},
};

type SignNetworkFeeProps = GetEarnTVLParameters;

export function StoryView(props: SignNetworkFeeProps) {
  const request = async () => {
    return getEarnTVL({
      ...props,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <p>This function gets the TVL of the DeFi vault.</p>

      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getEarnTVL.name}
      />

      <ErrorBlock>{error}</ErrorBlock>

      <CodeBlock text={data} />
    </>
  );
}
