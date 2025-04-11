import type { Meta, StoryObj } from '@storybook/react';

import { ChainId } from '../../common/chains';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import useQuery from '../../stories/hooks/useQuery';
import {
  getStakeAndBakeFee,
  IGetStakeAndBakeFeeParams,
} from './getStakeAndBakeFee';
import { Vault } from '../../vaults';
import { functionType } from '../../stories/components/decorators';

const meta = {
  title: 'read/getStakeAndBakeFee',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('read')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    vaultKey: Vault.Veda,
    chainId: ChainId.ethereum,
  },
};

type GetStakeAndBakeFeeProps = IGetStakeAndBakeFeeParams;

export function StoryView(props: GetStakeAndBakeFeeProps) {
  const request = async () => {
    return getStakeAndBakeFee({
      ...props,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  const value = data?.toFixed();

  return (
    <div>
      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getStakeAndBakeFee.name}
      />

      <CodeBlock text={error || data?.toString()} />

      {data && (
        <div className="mt-4 p-4 border rounded">
          <h3 className="text-lg font-bold mb-2">Fee Details</h3>
          <p>Stake and Bake Fee: {value} LBTC</p>
        </div>
      )}
    </div>
  );
}
