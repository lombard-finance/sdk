import type { Meta, StoryObj } from '@storybook/react';

import { ChainId } from '../../../common/chains';
import { Button } from '../../../stories/components/Button';
import { CodeBlock } from '../../../stories/components/CodeBlock';
import {
  functionType,
  wagmiDecorator } from '../../../stories/components/decorators';
import { ErrorBlock } from '../../../stories/components/error-block';
import { EXAMPLE_EVM_ADDRESS } from '../../../stories/constants';
import useQuery from '../../../stories/hooks/useQuery';
import {
  getEarnDeposits,
  GetEarnDepositsParameters } from './get-vault-deposits';

const meta = {
  title: 'vault/ops/getEarnDeposits',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [wagmiDecorator, functionType('api-get')] } satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    account: EXAMPLE_EVM_ADDRESS,
    chainId: ChainId.ethereum } };

type SignNetworkFeeProps = GetEarnDepositsParameters;

export function StoryView(props: SignNetworkFeeProps) {
  const request = async () => {
    return getEarnDeposits({
      ...props });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <p>This function gets the deposits made by a user to the DeFi vault.</p>

      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getEarnDeposits.name}
      />

      <ErrorBlock>{error}</ErrorBlock>

      <CodeBlock text={data} />
    </>
  );
}
