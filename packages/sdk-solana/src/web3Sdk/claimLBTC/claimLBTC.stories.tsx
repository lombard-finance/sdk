import { Env } from '@lombard.finance/sdk-common';
import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState } from 'react';

import { envToNetwork } from '../../const/getConfig';
import {
  Button,
  CodeBlock,
  ConnectButton,
  ErrorDisplay,
  OutputSelector,
  ResultDisplay,
  SectionCard,
} from '../../stories/components';
import { functionType } from '../../stories/decorators/function-type';
import { useConnect } from '../../stories/hooks/useConnect';
import { IOutput, useFetchOutputs } from '../../stories/hooks/useFetchOutputs';
import useQuery from '../../stories/hooks/useQuery';
import { claimLBTC } from './claimLBTC';
import { parseTransactionLogs } from './utils/parseTransactionLogs';

interface ClaimLbtcStoryArgs {
  environment: Env;
}

export const StoryView = ({ environment }: ClaimLbtcStoryArgs) => {
  const network = envToNetwork[environment];
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
    environment,
    isConnected: isConnected,
  });

  const request = async () => {
    if (!provider || !address) throw new Error('Wallet not connected.');
    if (!selectedOutput) throw new Error('Please select an output to claim.');
    if (!selectedOutput.raw_payload)
      throw new Error('Selected output has no raw_payload.');
    if (!selectedOutput.proof)
      throw new Error('Selected output has no proof (required for LBTC).');

    setTransactionLogs(null);
    try {
      const txHash = await claimLBTC(provider, {
        recipientAddress: address,
        amount: selectedOutput.value,
        network,
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
    [provider, address, selectedOutput, environment, refetchOutputs],
    false,
  );

  useEffect(() => {
    setSelectedOutput(null);
    setTransactionLogs(null);
  }, [isConnected, address, environment]);

  return (
    <>
      <ConnectButton
        connect={connect}
        disconnect={disconnect}
        isConnected={isConnected}
        isLoading={isConnecting}
        error={connectError}
        network={network}
        walletName={connectionData?.walletName}
        address={connectionData?.address}
      />

      {isConnected && address && provider && (
        <>
          <SectionCard title="Available Bitcoin Outputs">
            <OutputSelector
              address={address}
              environment={environment}
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
              disabled={
                isLoading ||
                !selectedOutput ||
                !selectedOutput.raw_payload
              }
              actionName="claimLBTC"
            />
            {selectedOutput && !selectedOutput.raw_payload && (
              <p className="text-warning small mt-1 mb-0">
                Output is still awaiting notarization. Use "Refresh Outputs" to
                check for updates.
              </p>
            )}
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

const meta: Meta<typeof StoryView> = {
  title: 'write/claimLBTC',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('write')],
  parameters: {
    docs: {
      description: {
        component: `Claim LBTC tokens on Solana.

Uses the legacy 3-step on-chain flow (\`claimLBTC\`):
1. Create Mint Payload → 2. Post Mint Signatures → 3. Mint From Payload`,
      },
    },
  },
  args: {
    environment: Env.stage,
  },
  argTypes: {
    environment: {
      control: { type: 'select' },
      options: Object.values(Env),
    },
  },
};
export default meta;

type Story = StoryObj<typeof meta>;
