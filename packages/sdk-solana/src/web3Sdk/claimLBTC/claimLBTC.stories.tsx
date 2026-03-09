import { Env } from '@lombard.finance/sdk-common';
import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState } from 'react';

import { envToNetwork, getConfig } from '../../const/getConfig';
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
import { claimToken } from '../claimToken';
import { claimLBTC } from './claimLBTC';
import { parseTransactionLogs } from './utils/parseTransactionLogs';

type TokenChoice = 'LBTC' | 'BTC.b';

interface ClaimLbtcStoryArgs {
  environment: Env;
  token: TokenChoice;
}

export const StoryView = ({ environment, token }: ClaimLbtcStoryArgs) => {
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

  const isBtcb = token === 'BTC.b';

  const request = async () => {
    if (!provider || !address) throw new Error('Wallet not connected.');
    if (!selectedOutput) throw new Error('Please select an output to claim.');
    if (!selectedOutput.raw_payload)
      throw new Error('Selected output has no raw_payload.');

    setTransactionLogs(null);
    try {
      let txHash: string;

      if (isBtcb) {
        const config = getConfig(environment);
        if (!config.btcbTokenMint)
          throw new Error(`BTC.b mint not configured for ${environment}`);
        if (!selectedOutput.proof)
          throw new Error('Selected output has no proof.');

        txHash = await claimToken(provider, {
          recipientAddress: address,
          tokenMint: config.btcbTokenMint,
          network,
          env: environment,
          rawPayload: selectedOutput.raw_payload,
          proofSignature: selectedOutput.proof,
          debug: true,
        });
      } else {
        if (!selectedOutput.proof)
          throw new Error('Selected output has no proof (required for LBTC).');

        txHash = await claimLBTC(provider, {
          recipientAddress: address,
          amount: selectedOutput.value,
          network,
          proofSignature: selectedOutput.proof,
          rawPayload: selectedOutput.raw_payload,
          debug: true,
        });
      }

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
    [provider, address, selectedOutput, environment, token, refetchOutputs],
    false,
  );

  useEffect(() => {
    setSelectedOutput(null);
    setTransactionLogs(null);
  }, [isConnected, address, environment, token]);

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
              actionName={isBtcb ? 'claimToken (BTC.b)' : 'claimLBTC'}
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
              successMessage={`${token} claimed!`}
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
        component: `Claim LBTC or BTC.b tokens on Solana.

**LBTC** uses the legacy 3-step on-chain flow (\`claimLBTC\`):
1. Create Mint Payload → 2. Post Mint Signatures → 3. Mint From Payload

**BTC.b** uses the Asset Router (\`claimToken\`):
Single \`mint_from_payload\` transaction after backend Consortium notarization.`,
      },
    },
  },
  args: {
    environment: Env.stage,
    token: 'LBTC',
  },
  argTypes: {
    environment: {
      control: { type: 'select' },
      options: Object.values(Env),
    },
    token: {
      control: { type: 'select' },
      options: ['LBTC', 'BTC.b'] as TokenChoice[],
    },
  },
};
export default meta;

type Story = StoryObj<typeof meta>;
