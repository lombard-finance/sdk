import { Env } from '@lombard.finance/sdk-common';
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { envToNetwork, getConfig } from '../../const/getConfig';
import {
  Button,
  CodeBlock,
  ConnectButton,
  ErrorDisplay,
  ResultDisplay,
  SectionCard,
} from '../../stories/components';
import { functionType } from '../../stories/decorators/function-type';
import { useConnect } from '../../stories/hooks/useConnect';
import useQuery from '../../stories/hooks/useQuery';
import { deposit } from './deposit';

interface DepositStoryArgs {
  environment: Env;
  amount: string;
  recipient: string;
  sourceTokenMint: string;
  toLchainId: string;
  toTokenAddress: string;
}

export const StoryView = ({
  environment,
  amount,
  recipient,
  sourceTokenMint,
  toLchainId,
  toTokenAddress,
}: DepositStoryArgs) => {
  const network = envToNetwork[environment];
  const config = getConfig(environment);
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

  const effectiveSource = sourceTokenMint || config.btcbTokenMint;
  const effectiveToToken = toTokenAddress || config.lbtcTokenMint;

  const request = async () => {
    if (!provider || !address) throw new Error('Wallet not connected.');
    if (!recipient)
      throw new Error('Recipient address is required (set in args).');
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0)
      throw new Error('Amount must be a positive number in BTC (set in args).');

    const amountSats = Math.round(parsedAmount * 1e8).toString();

    setTransactionLogs(null);
    try {
      const result = await deposit(provider, {
        amount: amountSats,
        recipient,
        sourceTokenMint: sourceTokenMint || undefined,
        toLchainId: toLchainId || undefined,
        toTokenAddress: toTokenAddress || undefined,
        network,
        env: environment,
        debug: true,
      });
      return result;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Debug logs:')) {
        const parts = err.message.split('Debug logs:\n');
        setTransactionLogs(parts[1]?.split('\n') || []);
      }
      throw err;
    }
  };

  const {
    data: txHash,
    error,
    isLoading,
    refetch: handleDeposit,
  } = useQuery(
    request,
    [
      provider,
      address,
      amount,
      recipient,
      sourceTokenMint,
      toLchainId,
      toTokenAddress,
      environment,
    ],
    false,
  );

  return (
    <>
      <ConnectButton
        connect={connect}
        disconnect={disconnect}
        isConnected={isConnected}
        isLoading={isConnecting}
        error={connectError}
        walletName={connectionData?.walletName}
        address={connectionData?.address}
        network={network}
      />

      {isConnected && (
        <>
          <SectionCard title="Configuration">
            <p>
              <strong>Environment:</strong> {environment}
            </p>
            <p>
              <strong>Network:</strong> {network}
            </p>
            <p>
              <strong>Amount:</strong> {amount} BTC
            </p>
            <p>
              <strong>Recipient:</strong> {recipient || <em>Not set</em>}
            </p>
            <p>
              <strong>Source token (e.g. BTC.b):</strong>{' '}
              {effectiveSource || <em>Not configured</em>}
            </p>
            <p>
              <strong>Destination token (e.g. LBTC):</strong>{' '}
              {effectiveToToken || <em>Not configured</em>}
            </p>
          </SectionCard>

          <div className="d-grid gap-2 my-4">
            <Button
              primary
              size="large"
              onClick={handleDeposit}
              isLoading={isLoading}
              actionName={deposit.name}
            />
          </div>

          {txHash && (
            <ResultDisplay
              result={txHash}
              title="Deposit Transaction Hash"
              successMessage="Success! Deposit (BTC.b → LBTC) transaction submitted."
            />
          )}
          {(error || connectError) && (
            <ErrorDisplay
              error={error || connectError}
              title="Deposit Error"
            />
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
  title: 'write/deposit (Asset Router)',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('write')],
  parameters: {
    docs: {
      description: {
        component: `Demonstrates depositing source token (e.g. BTC.b) for destination token (e.g. LBTC) via the Asset Router's \`deposit\` instruction.

**Flow:**
1. Connect a Solana wallet holding the source token (default: BTC.b)
2. Enter the recipient address and amount (in BTC)
3. Optionally override source mint, destination chain ID, and destination token
4. Call \`deposit\` — burns the source token and sends a GMP message through the Mailbox
5. The destination token (e.g. LBTC) is minted to the recipient on the target chain

**Example (devnet):** PROGRAM_ID=LomVyJDZ91jeVbNnTupJXKJTQFakJVMc87CmwDHYt95, MAILBOX=LomJw912MoUd7iiAesTQAgz1paLcTqi6ndG3w3pnKH9`,
      },
    },
  },
  args: {
    environment: Env.stage,
    amount: '0.0002',
    recipient: '',
    sourceTokenMint: '',
    toLchainId: '',
    toTokenAddress: '',
  },
  argTypes: {
    environment: {
      control: { type: 'select' },
      options: Object.values(Env),
    },
    amount: {
      control: { type: 'text' },
      description: 'Amount to deposit in BTC (e.g. 0.0002)',
    },
    recipient: {
      control: { type: 'text' },
      description:
        'Recipient address for the destination token (Solana base58)',
    },
    sourceTokenMint: {
      control: { type: 'text' },
      description: 'Source token mint override (defaults to BTC.b from config)',
    },
    toLchainId: {
      control: { type: 'text' },
      description:
        'Destination Lombard routing chain ID (hex). Defaults to Solana',
    },
    toTokenAddress: {
      control: { type: 'text' },
      description:
        'Destination token mint override (defaults to LBTC from config)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;
