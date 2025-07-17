import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../../../stories/components/Button';
import { CodeBlock } from '../../../stories/components/CodeBlock';
import {
  functionType,
  wagmiDecorator,
} from '../../../stories/components/decorators';
import { ErrorBlock } from '../../../stories/components/error-block';
import { EXAMPLE_EVM_ADDRESS } from '../../../stories/constants';
import useQuery from '../../../stories/hooks/useQuery';
import { Vault } from '../config';
import { GetVaultPointsParameters, getVaultPoints } from './get-vault-points';

const meta = {
  title: 'vault/metrics/getVaultPoints',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [wagmiDecorator, functionType('api-get')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    account: EXAMPLE_EVM_ADDRESS,
    vaultKey: Vault.Veda,
  },
};

type SignNetworkFeeProps = GetVaultPointsParameters;

export function StoryView(props: SignNetworkFeeProps) {
  const request = async () => {
    return getVaultPoints({
      ...props,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <p>This function gets the points earned by a user in the DeFi vault.</p>

      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getVaultPoints.name}
      />

      <ErrorBlock>{error}</ErrorBlock>

      <CodeBlock text={data} />
    </>
  );
}
