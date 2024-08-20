import type { Meta } from '@storybook/react';
import Web3, { FMT_BYTES, FMT_NUMBER } from 'web3';
import { OChainId, TChainId } from '../../common/types/types';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { useConnect } from '../../stories/hooks/useConnect';
import useQuery from '../../stories/hooks/useQuery';
import { fromCamelCase } from '../../stories/utils/fromCamelCase';
import { signLbtcDestionationAddr } from './signLbtcDestionationAddr';

const { name } = signLbtcDestionationAddr;
const nameWithWhitespaces = fromCamelCase(name);

const meta = {
  title: 'Web3SDK/signLbtcDestionationAddr',
  component: StoryView,
  tags: ['autodocs'],
} satisfies Meta<typeof StoryView>;

export default meta;

export function StoryView() {
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

    return signLbtcDestionationAddr(connectData);
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
        address. The signature is used for generating the deposit address.
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

async function getWalletInfo(web3: Web3) {
  const [account] = await web3.eth.getAccounts();

  if (!account) {
    throw new Error('No account found');
  }

  const chainId = await web3.eth.getChainId({
    bytes: FMT_BYTES.HEX,
    number: FMT_NUMBER.NUMBER,
  });

  return {
    account,
    chainId,
  };
}

function isValidChain(chainId: number): chainId is TChainId {
  return Object.values(OChainId).includes(chainId as TChainId);
}
