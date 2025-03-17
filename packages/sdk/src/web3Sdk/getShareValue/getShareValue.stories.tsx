import type { Meta, StoryObj } from '@storybook/react';

import { OChainId } from '../../common/types/types';
import { Button } from '../../stories/components/Button';
import useQuery from '../../stories/hooks/useQuery';
import { getShareValue, IGetShareValueParameters } from './getShareValue';
import { Vault } from '../../vaults';

const meta = {
  title: 'Web3SDK/getShareValue',
  component: StoryView,
  tags: ['autodocs'],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    chainId: OChainId.ethereum,
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
      <Button onClick={refetch} disabled={isLoading} isLoading={isLoading}>
        Get LBTCv value
      </Button>

      {data && (
        <div className="mt-4 p-4 border rounded">
          <h3 className="text-lg font-bold mb-2">LBTCv share value</h3>
          <p>1 LBTCv = {value} LBTC</p>
        </div>
      )}
    </div>
  );
}
