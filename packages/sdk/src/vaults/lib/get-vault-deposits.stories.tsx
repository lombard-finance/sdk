import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import useQuery from '../../stories/hooks/useQuery';
import { Vault } from '..';
import {
  getVaultDeposits,
  GetVaultDepositsParameters,
} from './get-vault-deposits';
import { exampleEvmAddress } from '../../stories/const';
import { OChainId } from '../../common/types/types';

const meta = {
  title: 'vault/getVaultDeposits',
  component: StoryView,
  tags: ['autodocs'],
  
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    account: exampleEvmAddress,
    chainId: OChainId.ethereum,
    vaultKey: Vault.Veda,
  },
};

type SignNetworkFeeProps = GetVaultDepositsParameters;

export function StoryView(props: SignNetworkFeeProps) {
  const request = async () => {
    return getVaultDeposits({
      ...props,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <p>This function gets the deposits made by a user to the DeFi vault.</p>

      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
      >
        {getVaultDeposits.name}
      </Button>

      <CodeBlock text={error || data} />
    </>
  );
}
