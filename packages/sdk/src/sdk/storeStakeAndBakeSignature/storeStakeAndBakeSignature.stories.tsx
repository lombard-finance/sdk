import type { Meta, StoryObj } from '@storybook/react';
import { defaultEnv } from '@lombard.finance/sdk-common';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { useConnect } from '../../stories/hooks/useConnect';
import useQuery from '../../stories/hooks/useQuery';

import {
  ISignStakeAndBakeParams,
  signStakeAndBake,
} from '../../web3Sdk/signStakeAndBake/signStakeAndBake';
import { storeStakeAndBakeSignature } from './storeStakeAndBakeSignature';

const meta = {
  title: 'SDK/storeStakeAndBakeSignature',
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

    // First sign the authorization
    const { signature, typedData } = await signStakeAndBake({
      provider: connectData.provider,
      address: connectData.account,
      chainId: connectData.chainId,
      value: props.value,
      expiry: props.expiry,
      vaultKey: props.vaultKey,
    });

    // Then store it
    await storeStakeAndBakeSignature({
      signature,
      typedData,
      env: defaultEnv,
    });

    return { signature, typedData };
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  const formattedConnectData = connectData && {
    account: connectData.account,
    chainId: connectData.chainId,
  };

  return (
    <>
      <p>
        This method signs and stores the stake and bake signature in the
        backend. The signature is used to approve spending of tokens.
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
        Sign and Store Stake and Bake Signature
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
