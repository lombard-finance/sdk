import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '../../../stories/components/Button';
import { CodeBlock } from '../../../stories/components/CodeBlock';
import { ConnectButton } from '../../../stories/components/ConnectButton';
import {
  functionType,
  wagmiDecorator,
} from '../../../stories/components/decorators';
import { ErrorBlock } from '../../../stories/components/error-block';
import {
  canPerformAction,
  useConnection,
} from '../../../stories/hooks/useConnection';
import useQuery from '../../../stories/hooks/useQuery';
import { Vault } from '../config';
import { deposit,DepositParameters } from './deposit';

const meta = {
  title: 'vault/ops/deposit',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [wagmiDecorator, functionType('write')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    vaultKey: Vault.Veda,
    amount: '0.0001',
    approve: true,
  },
};

type SignNetworkFeeProps = Omit<
  DepositParameters,
  'account' | 'chainId' | 'provider'
>;

export function StoryView(props: SignNetworkFeeProps) {
  const connection = useConnection();

  const request = async () => {
    if (!canPerformAction(connection)) {
      return;
    }

    return deposit({
      ...props,

      account: connection.account.address,
      chainId: connection.account.chainId,
      provider: connection.provider,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <p>This method deposits funds to the chosen DeFi vault.</p>

      <div className="mb-4">
        <ConnectButton />
      </div>

      <Button
        onClick={refetch}
        disabled={isLoading || !connection.account.address}
        isLoading={isLoading}
        actionName={deposit.name}
      />

      <ErrorBlock>{error}</ErrorBlock>

      <CodeBlock text={data} />
    </>
  );
}
