import type { Meta, StoryObj } from '@storybook/react';

import { ChainId } from '../../common/chains';
import { Button } from '../../stories/components/Button';
import { functionType } from '../../stories/components/decorators';
import useQuery from '../../stories/hooks/useQuery';
import { Vault } from '../../vaults/lib/config';
import { getShareValue,IGetShareValueParameters } from './getShareValue';

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

  const { data, error: _error, isLoading, refetch } = useQuery(request, [], false);

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
          <h3 className="text-lg font-bold mb-2">
            LBTCv (Vault shares) share value
          </h3>
          <p>1 LBTCv (Vault shares) = {value} LBTC</p>
        </div>
      )}
    </div>
  );
}
