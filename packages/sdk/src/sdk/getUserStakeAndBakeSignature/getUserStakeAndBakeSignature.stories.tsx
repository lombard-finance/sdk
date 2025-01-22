import type { Meta, StoryObj } from '@storybook/react';
import { OChainId, OEnv } from '../../common/types/types';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { useConnect } from '../../stories/hooks/useConnect';
import useQuery from '../../stories/hooks/useQuery';
import {
  IGetUserStakeAndBakeSignatureParams,
  getUserStakeAndBakeSignature,
} from './getUserStakeAndBakeSignature';

const meta = {
  title: 'SDK/getUserStakeAndBakeSignature',
  component: StoryView,
  tags: ['autodocs'],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    env: OEnv.stage,
  },
};

type GetUserStakeAndBakeSignatureProps = Pick<
  IGetUserStakeAndBakeSignatureParams,
  'env'
>;

export function StoryView(props: GetUserStakeAndBakeSignatureProps) {
  const {
    data: connectData,
    error: connectError,
    isLoading: isConnectLoading,
    connect,
  } = useConnect();

  const request = async () => {
    if (!connectData?.account) {
      return;
    }

    return getUserStakeAndBakeSignature({
      ...props,
      userDestinationAddress: connectData.account,
      chainId: connectData.chainId,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  const formattedConnectData = connectData && {
    account: connectData.account,
    chainId: connectData.chainId,
  };

  return (
    <>
      <p>
        This method gets the user's stake and bake signature from the API. The
        signature is used to approve spending of tokens.
      </p>

      <div className="mb-4">
        <Button
          onClick={connect}
          disabled={isConnectLoading}
          isLoading={isConnectLoading}
        >
          Connect
        </Button>

        <CodeBlock text={connectError || formattedConnectData} />
      </div>

      <Button onClick={refetch} disabled={isLoading} isLoading={isLoading}>
        Get User Stake and Bake Signature
      </Button>

      <CodeBlock text={error || data} />
    </>
  );
}
