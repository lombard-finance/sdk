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
import { claimToken } from './claimToken';

type TokenChoice = 'BTC.b' | 'LBTC';

interface ClaimTokenStoryArgs {
  environment: Env;
  token: TokenChoice;
}

const getTokenMint = (env: Env, token: TokenChoice): string | null => {
  const config = getConfig(env);
  if (token === 'BTC.b') return config.btcbTokenMint;
  return config.lbtcTokenMint;
};

export const StoryView = ({ environment, token }: ClaimTokenStoryArgs) => {
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

  const tokenMint = getTokenMint(environment, token);

  const request = async () => {
    if (!provider || !address) throw new Error('Wallet not connected.');
    if (!selectedOutput) throw new Error('Please select an output to claim.');
    if (!selectedOutput.raw_payload)
      throw new Error('Selected output has no raw_payload.');
    if (!selectedOutput.proof) throw new Error('Selected output has no proof.');
    if (!tokenMint)
      throw new Error(
        `Token mint not configured for ${token} on ${environment}.`,
      );

    setTransactionLogs(null);
    try {
      const txHash = await claimToken(provider, {
        recipientAddress: address,
        tokenMint,
        network,
        env: environment,
        rawPayload: selectedOutput.raw_payload,
        proofSignature: selectedOutput.proof,
        debug: true,
      });
      refetchOutputs();
      setSelectedOutput(null);
      return txHash;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Debug logs:')) {
        const parts = err.message.split('Debug logs:\n');
        setTransactionLogs(parts[1]?.split('\n') || []);
      }
      throw err;
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
          <SectionCard title="Configuration">
            <p>
              <strong>Token:</strong> {token}
            </p>
            <p>
              <strong>Token Mint:</strong>{' '}
              {tokenMint || <em>Not configured</em>}
            </p>
            <p>
              <strong>Environment:</strong> {environment}
            </p>
            <p>
              <strong>Network:</strong> {network}
            </p>
          </SectionCard>

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
                !selectedOutput.raw_payload ||
                !tokenMint
              }
              actionName={`claimToken (${token})`}
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
              successMessage={`${token} claimed via Asset Router!`}
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
  title: 'write/claimToken (Asset Router)',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('write')],
  parameters: {
    docs: {
      description: {
        component: `Demonstrates minting tokens (BTC.b or LBTC) via the Asset Router program (Ledger v2).

**Flow:**
1. Generate a BTC deposit address via API with \`token_address\` parameter
2. Send BTC to the deposit address
3. Wait for backend to notarize the deposit (Consortium validation)
4. Call \`claimToken\` to mint tokens via Asset Router's \`mint_from_payload\`

The Consortium validation is handled entirely by the backend, so the on-chain flow
is a single transaction.`,
      },
    },
  },
  args: {
    environment: Env.stage,
    token: 'BTC.b',
  },
  argTypes: {
    environment: {
      control: { type: 'select' },
      options: Object.values(Env),
    },
    token: {
      control: { type: 'select' },
      options: ['BTC.b', 'LBTC'] as TokenChoice[],
    },
  },
};
export default meta;

type Story = StoryObj<typeof meta>;
