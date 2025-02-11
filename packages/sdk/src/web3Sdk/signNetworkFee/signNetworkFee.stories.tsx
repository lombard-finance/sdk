import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { useConnect } from '../../stories/hooks/useConnect';
import useQuery from '../../stories/hooks/useQuery';
import { fromCamelCase } from '../../stories/utils/fromCamelCase';
import { MS_PER_DAY } from '../const';
import { ISignNetworkFeeParams, signNetworkFee } from './signNetworkFee';
import { defaultEnv } from '../../common/const';

const { name } = signNetworkFee;
const nameWithWhitespaces = fromCamelCase(name);

const meta = {
  title: 'Web3SDK/signNetworkFee',
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

type SignNetworkFeeProps = Pick<ISignNetworkFeeParams, 'env'>;

export function StoryView(props: SignNetworkFeeProps) {
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

    return signNetworkFee({
      ...connectData,
      ...props,
      fee: '1100',
      expiry: Date.now() + MS_PER_DAY,
      address: connectData.account,
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
        This method is used to get the signature of the Liquid BTC destination
        address. The signature is used for auto-mint feature.
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

      <CodeBlock text={error || data} />
    </>
  );
}
