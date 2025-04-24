import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState } from 'react';
import {
  Button,
  CodeBlock,
  ConnectButton,
  ErrorDisplay,
  OutputSelector,
  ResultDisplay,
  SectionCard,
} from '../../stories/components';
import { useConnect } from '../../stories/hooks/useConnect';
import { IOutput, useFetchOutputs } from '../../stories/hooks/useFetchOutputs';
import { SolanaNetwork } from '../../types';
import { claimLBTC } from './claimLBTC';
import { parseTransactionLogs } from './utils/parseTransactionLogs';
import useQuery from '../../stories/hooks/useQuery';
import { functionType } from '../../stories/decorators/function-type';

interface ClaimLbtcStoryArgs {
  network: SolanaNetwork;
}

export const StoryView = ({ network }: ClaimLbtcStoryArgs) => {
  const [selectedOutput, setSelectedOutput] = useState<IOutput | null>(null);
  const [transactionLogs, setTransactionLogs] = useState<string[] | null>(null);

  const {
    data: connectionData,
    error: connectError,
    isLoading: isConnecting,
    connect,
    disconnect,
  } = useConnect();
  const isConnected = !!connectionData;
  const address = connectionData?.address;
  const provider = connectionData?.provider;

  const { refetchOutputs } = useFetchOutputs({
    address: address ?? undefined,
    environment: network,
    isConnected: isConnected,
  });

  const request = async () => {
    if (!provider || !address) throw new Error('Wallet not connected.');
    if (!selectedOutput) throw new Error('Please select an output to claim.');
    if (!selectedOutput.raw_payload || !selectedOutput.proof)
      throw new Error('Selected output data missing.');

    setTransactionLogs(null);
    try {
      const txHash = await claimLBTC(provider, {
        recipientAddress: address,
        amount: selectedOutput.value,
        network: network,
        proofSignature: selectedOutput.proof,
        rawPayload: selectedOutput.raw_payload,
        debug: true,
      });
      refetchOutputs();
      setSelectedOutput(null);
      return txHash;
    } catch (err: unknown) {
      const { errorMessage, errorLogs } = parseTransactionLogs(err);
      setTransactionLogs(errorLogs);
      throw new Error(errorMessage);
    }
  };

  const {
    data: result,
    error,
    isLoading,
    refetch: handleClaim,
  } = useQuery(
    request,
    [provider, address, selectedOutput, network, refetchOutputs],
    false,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: clean  up on network change
  useEffect(() => {
    setSelectedOutput(null);
    setTransactionLogs(null);
  }, [isConnected, address, network]);

  console.log({ result, error });

  return (
    <>
      <ConnectButton
        connect={connect}
        disconnect={disconnect}
        data={connectionData}
        isLoading={isConnecting}
        error={connectError}
        network={network}
      />

      {isConnected && address && provider && (
        <>
          <SectionCard title="Available Bitcoin Outputs">
            <OutputSelector
              address={address}
              network={network}
              isConnected={isConnected}
              selectedOutput={selectedOutput}
              onOutputSelect={setSelectedOutput}
            />
          </SectionCard>

          <div className="d-grid gap-2 mb-4">
            <Button
              primary
              size="large"
              onClick={handleClaim}
              isLoading={isLoading}
              disabled={isLoading || !selectedOutput}
              actionName={claimLBTC.name}
            />
          </div>

          {result && (
            <ResultDisplay
              result={result}
              title="Claim Transaction Hash"
              successMessage="LBTC claimed!"
            />
          )}

          {error && (
            <ErrorDisplay error={error || connectError} title="Claim Error" />
          )}

          {transactionLogs && transactionLogs.length > 0 && (
            <SectionCard title="Transaction Logs (Debug)">
              <CodeBlock text={transactionLogs.join('\n')} />
            </SectionCard>
          )}
        </>
      )}
    </>
  );
};

// Meta and Story Definition at End
const meta: Meta<typeof StoryView> = {
  title: 'write/claimLBTC',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('write')],
  parameters: {
    docs: {
      description: {
        component: `Demonstrates claiming LBTC using \`claimLBTC\`. Requires selecting a valid output.
          About LBTC Claiming on Solana:
          Claiming LBTC on Solana is a multi-step process handled transparently by the SDK:
1.  Token Account Creation: Creates an Associated Token Account (ATA) if needed.
2.  Create Mint Payload: Submits notarized Bitcoin transaction details.
3.  Post Mint Signatures: Posts validator signatures (proof).
4.  Mint From Payload: Executes the final token minting.`,
      },
    },
  },
  args: {
    network: SolanaNetwork.devnet,
  },
  argTypes: {
    network: {
      control: { type: 'select' },
      options: Object.values(SolanaNetwork),
    },
  },
};
export default meta;

type Story = StoryObj<typeof meta>;
