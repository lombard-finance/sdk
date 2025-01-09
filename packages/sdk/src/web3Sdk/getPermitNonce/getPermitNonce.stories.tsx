import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { useConnect } from '../../stories/hooks/useConnect';
import useQuery from '../../stories/hooks/useQuery';
import { getPermitNonce, IGetPermitNonceParams } from './getPermitNonce';

const meta = {
  title: 'Web3SDK/getPermitNonce',
  component: StoryView,
  tags: ['autodocs'],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    owner: '0x1234567890123456789012345678901234567890',
  },
};

type GetPermitNonceProps = Pick<IGetPermitNonceParams, 'owner'>;

export function StoryView(props: GetPermitNonceProps) {
  const { data: connectData, error: connectError } = useConnect();

  const request = async () => {
    return getPermitNonce({
      chainId: 1, // Ethereum mainnet
      rpcUrl: 'https://rpc.ankr.com/eth',
      ...props,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  const formattedConnectData = connectData && {
    account: connectData.account,
    chainId: connectData.chainId,
  };

  return (
    <>
      <div className="mb-4">
        <CodeBlock text={connectError || formattedConnectData} />
      </div>

      <Button onClick={refetch} disabled={isLoading} isLoading={isLoading}>
        Get Permit Nonce
      </Button>

      <CodeBlock text={error || data} />

      {data && (
        <div className="mt-4 p-4 border rounded">
          <h3 className="text-lg font-bold mb-2">Permit Nonce Details</h3>
          <p>Owner: {props.owner}</p>
          <p>Nonce: {data}</p>
        </div>
      )}
    </>
  );
}
