import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { useConnect } from '../../stories/hooks/useConnect';
import useQuery from '../../stories/hooks/useQuery';
import { fromCamelCase } from '../../stories/utils/fromCamelCase';
import { signStakeAndBake, ISignStakeAndBakeParams } from './signStakeAndBake';

const { name } = signStakeAndBake;
const nameWithWhitespaces = fromCamelCase(name);

const meta = {
  title: 'Web3SDK/signStakeAndBake',
  component: StoryView,
  tags: ['autodocs'],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    value: '20000',
    expiry: 3600,
    vaultKey: 'veda',
  },
};

type SignStakeAndBakeParams = Pick<
  ISignStakeAndBakeParams,
  'value' | 'expiry' | 'vaultKey'
>;

export function StoryView(props: SignStakeAndBakeParams) {
  const {
    data: connectData,
    error: connectError,
    isLoading: isConnectLoading,
    connect,
  } = useConnect();

  const request = async () => {
    if (!connectData || !connectData.provider) {
      return;
    }

    return signStakeAndBake({
      provider: connectData.provider,
      address: connectData.account,
      chainId: connectData.chainId,

      value: props.value,
      expiry: props.expiry,
      vaultKey: props.vaultKey,
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
        This method is used to sign a permit for stake and bake operations. The
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

      <Button
        onClick={refetch}
        disabled={isLoading || !connectData}
        isLoading={isLoading}
      >
        {nameWithWhitespaces}
      </Button>

      <CodeBlock
        text={
          error ||
          (data && {
            ...data,
            signature: data.signature,
            typedData: data.typedData ? JSON.parse(data.typedData) : '',
          })
        }
      />
    </>
  );
}
