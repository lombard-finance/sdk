import type { Meta, StoryObj } from '@storybook/react';
import { ChainId } from '../../common/chains';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import useQuery from '../../stories/hooks/useQuery';
import { getLBTCMintingFee } from './getLBTCMintingFee';
import { functionType } from '../../stories/components/decorators';

const meta = {
  title: 'read/getLBTCMintingFee',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('read')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Holesky: Story = {
  args: {
    chainId: ChainId.holesky,
  },
};

export const Ethereum: Story = {
  args: {
    chainId: ChainId.ethereum,
  },
};

type GetLBTCMintingFeeProps = {
  chainId: ChainId;
};

export function StoryView(props: GetLBTCMintingFeeProps) {
  const request = async () => {
    return getLBTCMintingFee({
      chainId: props.chainId,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <div>
      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getLBTCMintingFee.name}
      />

      <CodeBlock text={error || data?.toString()} />

      {data && (
        <div className="mt-4 p-4 border rounded">
          <h3 className="text-lg font-bold mb-2">Fee Details</h3>
          <p>Minting Fee: {data.toString()} BTC</p>
        </div>
      )}
    </div>
  );
}
