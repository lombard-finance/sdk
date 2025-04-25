import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../../../stories/components/Button';
import { CodeBlock } from '../../../stories/components/CodeBlock';
import useQuery from '../../../stories/hooks/useQuery';
import {
  functionType,
  wagmiDecorator,
} from '../../../stories/components/decorators';
import { Vault } from '../config';
import { ErrorBlock } from '../../../stories/components/error-block';
import { getVaultApy, GetVaultApyParameters } from './get-vault-apy';

const meta = {
  title: 'vault/metrics/getVaultApy',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [wagmiDecorator, functionType('api-get')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    vaultKey: Vault.Veda,
  },
};

type SignNetworkFeeProps = GetVaultApyParameters;

export function StoryView(props: SignNetworkFeeProps) {
  const request = async () => {
    return getVaultApy({
      ...props,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <p>This function gets the APY entries of the DeFi vault.</p>

      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getVaultApy.name}
      />

      <ErrorBlock>{error}</ErrorBlock>

      <CodeBlock text={data} />
    </>
  );
}
