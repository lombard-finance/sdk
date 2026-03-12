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
import { redeem } from './redeem';

interface RedeemStoryArgs {
  environment: Env;
  amount: string;
  recipient: string;
  tokenMint: string;
  toLchainId: string;
  toTokenAddress: string;
}

export const StoryView = ({
  environment,
  amount,
  recipient,
  tokenMint,
  toLchainId,
  toTokenAddress,
}: RedeemStoryArgs) => {
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

  const effectiveMint = tokenMint || config.lbtcTokenMint;
  const effectiveToToken = toTokenAddress || config.btcbTokenMint;

  const request = async () => {
    if (!provider || !address) throw new Error('Wallet not connected.');
    if (!recipient) throw new Error('Recipient address is required (set in args).');
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0)
      throw new Error('Amount must be a positive number in BTC (set in args).');

    const amountSats = Math.round(parsedAmount * 1e8).toString();

    setTransactionLogs(null);
    try {
      const result = await redeem(provider, {
        amount: amountSats,
        recipient,
        tokenMint: tokenMint || undefined,
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
    refetch: handleRedeem,
  } = useQuery(
    request,
    [provider, address, amount, recipient, tokenMint, toLchainId, toTokenAddress, environment],
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
              <strong>Source token mint:</strong>{' '}
              {effectiveMint || <em>Not configured</em>}
            </p>
            <p>
              <strong>Destination token:</strong>{' '}
              {effectiveToToken || <em>Not configured</em>}
            </p>
          </SectionCard>

          <div className="d-grid gap-2 my-4">
            <Button
              primary
              size="large"
              onClick={handleRedeem}
              isLoading={isLoading}
              actionName={redeem.name}
            />
          </div>

          {txHash && (
            <ResultDisplay
              result={txHash}
              title="Redeem Transaction Hash"
              successMessage="Success! Redeem transaction submitted."
            />
          )}
          {(error || connectError) && (
            <ErrorDisplay
              error={error || connectError}
              title="Redeem Error"
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
  title: 'write/redeem (Asset Router)',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('write')],
  parameters: {
    docs: {
      description: {
        component: `Demonstrates generic token redemption via the Asset Router's \`redeem\` instruction.

**Flow:**
1. Connect a Solana wallet holding the source token (defaults to LBTC)
2. Enter the recipient address and amount (in BTC)
3. Optionally override source mint, destination chain ID, and destination token
4. Call \`redeem\` — burns the source token and sends a GMP message through the Mailbox
5. The destination token is routed to the recipient on the target chain`,
      },
    },
  },
  args: {
    environment: Env.stage,
    amount: '0.0002',
    recipient: '',
    tokenMint: '',
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
      description: 'Amount to redeem in BTC (e.g. 0.0002)',
    },
    recipient: {
      control: { type: 'text' },
      description: 'Recipient address on the destination chain (base58 for Solana)',
    },
    tokenMint: {
      control: { type: 'text' },
      description: 'Source token mint override (defaults to LBTC from config)',
    },
    toLchainId: {
      control: { type: 'text' },
      description: 'Destination Lombard routing chain ID (hex). Defaults to Solana routing chain ID',
    },
    toTokenAddress: {
      control: { type: 'text' },
      description: 'Destination token address/mint override (defaults to BTC.b from config)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;
