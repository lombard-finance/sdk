import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '../../../stories/components/Button';
import { CodeBlock } from '../../../stories/components/CodeBlock';
import {
  functionType,
  wagmiDecorator } from '../../../stories/components/decorators';
import { ErrorBlock } from '../../../stories/components/error-block';
import useQuery from '../../../stories/hooks/useQuery';
import { getEarnApy,GetEarnApyParameters } from './get-vault-apy';

const meta = {
  title: 'vault/metrics/getEarnApy',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [wagmiDecorator, functionType('api-get')] } satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
  } };

type SignNetworkFeeProps = GetEarnApyParameters;

export function StoryView(props: SignNetworkFeeProps) {
  const request = async () => {
    return getEarnApy({
      ...props });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <p>This function gets the APY entries of the DeFi vault.</p>

      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getEarnApy.name}
      />

      <ErrorBlock>{error}</ErrorBlock>

      <CodeBlock text={data} />
    </>
  );
}
