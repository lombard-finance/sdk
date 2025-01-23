import type { Meta, StoryObj } from '@storybook/react';

import { OChainId } from '../../common/types/types';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import useQuery from '../../stories/hooks/useQuery';
import {
  getStakeAndBakeFee,
  IGetStakeAndBakeFeeParams,
} from './getStakeAndBakeFee';
import BigNumber from 'bignumber.js';
import { fromSatoshi } from '../../common/utils/convertSatoshi';

const meta = {
  title: 'Web3SDK/getStakeAndBakeFee',
  component: StoryView,
  tags: ['autodocs'],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    chainId: OChainId.binanceSmartChain,
    rpcUrl: 'https://rpc.ankr.com/bsc',
    vaultAddress: '0xC8bbF6153D7Ba105f1399D992ebd32B0541996ef',
  },
};

type GetStakeAndBakeFeeProps = Pick<
  IGetStakeAndBakeFeeParams,
  'chainId' | 'rpcUrl' | 'vaultAddress'
>;

export function StoryView(props: GetStakeAndBakeFeeProps) {
  const request = async () => {
    return getStakeAndBakeFee({
      ...props,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  const value = new BigNumber(fromSatoshi(data || 0)).toString();

  return (
    <div>
      <Button onClick={refetch} disabled={isLoading} isLoading={isLoading}>
        Get Stake and Bake Fee
      </Button>

      <CodeBlock text={error || data?.toString()} />

      {data && (
        <div className="mt-4 p-4 border rounded">
          <h3 className="text-lg font-bold mb-2">Fee Details</h3>
          <p>Stake and Bak Fee: {value} LBTC</p>
        </div>
      )}
    </div>
  );
}
