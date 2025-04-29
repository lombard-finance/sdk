import type { Meta, StoryObj } from '@storybook/react';

import { ChainId } from '../../common/chains';
import { Button } from '../../stories/components/Button';
import useQuery from '../../stories/hooks/useQuery';
import { getShareValue, IGetShareValueParameters } from './getShareValue';
import { Vault } from '../../vaults/lib/config';
import { functionType } from '../../stories/components/decorators';

const meta = {
  title: 'read/getShareValue',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('read')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    chainId: ChainId.ethereum,
    vaultKey: Vault.Veda,
  },
};

export function StoryView(props: IGetShareValueParameters) {
  const request = async () => {
    return getShareValue({
      ...props,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  const value = data?.toString();

  return (
    <div>
      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getShareValue.name}
      />

      {data && (
        <div className="mt-4 p-4 border rounded">
          <h3 className="text-lg font-bold mb-2">LBTCv share value</h3>
          <p>1 LBTCv = {value} LBTC</p>
        </div>
      )}
    </div>
  );
}
