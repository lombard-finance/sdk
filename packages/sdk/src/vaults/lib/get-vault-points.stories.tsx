import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import useQuery from '../../stories/hooks/useQuery';
import { Vault } from '..';
import { getVaultPoints, GetVaultPointsParameters } from './get-vault-points';
import { exampleEvmAddress } from '../../stories/const';

const meta = {
  title: 'vault/getVaultPoints',
  component: StoryView,
  tags: ['autodocs'],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    account: exampleEvmAddress,
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
      >
        {getVaultPoints.name}
      </Button>

      <CodeBlock text={error || data} />
    </>
  );
}
