import type { Meta, StoryObj } from '@storybook/react';

import { OChainId } from '../../common/types/types';
import { Button } from '../../stories/components/Button';
import useQuery from '../../stories/hooks/useQuery';
import {
  getSharesByAddress,
  IGetSharesByAddressParameters,
} from './getSharesByAddress';
import { Vault } from '../../vaults';
import { exampleEvmAddress } from '../../stories/const';
import { CodeBlock } from '../../stories/components/CodeBlock';

const meta = {
  title: 'Web3SDK/getSharesByAddress',
  component: StoryView,
  tags: ['autodocs'],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    chainId: OChainId.ethereum,
    address: exampleEvmAddress,
    vaultKey: Vault.Veda,
  },
};

export function StoryView(props: IGetSharesByAddressParameters) {
  const request = async () => {
    return getSharesByAddress({
      ...props,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <div>
      <Button onClick={refetch} disabled={isLoading} isLoading={isLoading}>
        Get LBTCv shares owned
      </Button>

      <CodeBlock text={error || data} />

      {data && (
        <div className="mt-4 p-4 border rounded">
          <h3 className="text-lg font-bold mb-2">LBTCv shares owned</h3>
          <p>
            <b>{data.balance.toString()}</b> LBTCv ={' '}
            {data.balanceLbtc.toString()} LBTC
          </p>
        </div>
      )}
    </div>
  );
}
