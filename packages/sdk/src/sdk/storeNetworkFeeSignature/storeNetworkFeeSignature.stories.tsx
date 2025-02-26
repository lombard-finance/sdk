import type { Meta, StoryObj } from '@storybook/react';
import { defaultEnv } from '@lombard.finance/sdk-common';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { useConnect } from '../../stories/hooks/useConnect';
import useQuery from '../../stories/hooks/useQuery';
import {
  IStoreNetworkFeeSignatureParams,
  storeNetworkFeeSignature,
} from './storeNetworkFeeSignature';

const meta = {
  title: 'SDK/storeNetworkFeeSignature',
  component: StoryView,
  tags: ['autodocs'],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    env: defaultEnv,
  },
};

type StoreNetworkFeeSignatureProps = Pick<
  IStoreNetworkFeeSignatureParams,
  'env'
>;

export function StoryView(props: StoreNetworkFeeSignatureProps) {
  const {
    data: connectData,
    error: connectError,
    isLoading: isConnectLoading,
    connect,
  } = useConnect();

  const request = async () => {
    if (!connectData) {
      return;
    }

    return storeNetworkFeeSignature({
      address: connectData.account,
      ...props,
      signature: '',
      typedData: '',
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
        <Button
          onClick={connect}
          disabled={isConnectLoading}
          isLoading={isConnectLoading}
        >
          Connect
        </Button>

        <CodeBlock text={connectError || formattedConnectData} />
      </div>

      <Button
        onClick={refetch}
        disabled={isLoading || !connectData}
        isLoading={isLoading}
      >
        Authorize
      </Button>

      <CodeBlock text={error || data} />
    </>
  );
}
