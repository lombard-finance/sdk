import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import useQuery from '../../stories/hooks/useQuery';
import {
  functionType,
  wagmiDecorator,
} from '../../stories/components/decorators';
import { Vault } from '..';
import { ErrorBlock } from '../../stories/components/error-block';
import { EXAMPLE_EVM_ADDRESS } from '../../stories/constants';
import { ChainId } from '../../common/chains';
import {
  getVaultWithdrawals,
  GetVaultWithdrawalsParameters,
} from './get-vault-withdrawals';

const meta = {
  title: 'vault/getVaultWithdrawals',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [wagmiDecorator, functionType('api-get')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    account: EXAMPLE_EVM_ADDRESS,
    chainId: ChainId.ethereum,
    vaultKey: Vault.Veda,
  },
};

type SignNetworkFeeProps = GetVaultWithdrawalsParameters;

export function StoryView(props: SignNetworkFeeProps) {
  const request = async () => {
    return getVaultWithdrawals({
      ...props,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <p>
        This function gets the withdrawals made by a user from the DeFi vault.
      </p>

      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getVaultWithdrawals.name}
      />

      <ErrorBlock>{error}</ErrorBlock>

      <CodeBlock text={data} />
    </>
  );
}
