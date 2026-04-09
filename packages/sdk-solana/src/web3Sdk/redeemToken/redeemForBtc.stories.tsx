import { Env } from "@lombard.finance/sdk-common";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { envToNetwork } from "../../const/getConfig";
import {
  Button,
  CodeBlock,
  ConnectButton,
  ErrorDisplay,
  ResultDisplay,
  SectionCard,
} from "../../stories/components";
import { functionType } from "../../stories/decorators/function-type";
import { useConnect } from "../../stories/hooks/useConnect";
import useQuery from "../../stories/hooks/useQuery";
import { redeemForBtc } from "./redeemForBtc";

interface RedeemForBtcStoryArgs {
  environment: Env;
  amount: string;
  btcAddress: string;
  tokenMint: string;
}

export const StoryView = ({
  environment,
  amount,
  btcAddress,
  tokenMint,
}: RedeemForBtcStoryArgs) => {
  const network = envToNetwork[environment];
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

  const request = async () => {
    if (!provider || !address) throw new Error("Wallet not connected.");
    if (!btcAddress)
      throw new Error("Destination Bitcoin address is required (set in args).");
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0)
      throw new Error("Amount must be a positive number in BTC (set in args).");

    const amountSats = Math.round(parsedAmount * 1e8).toString();

    setTransactionLogs(null);
    try {
      const result = await redeemForBtc(provider, {
        amount: amountSats,
        btcAddress,
        tokenMint: tokenMint || undefined,
        network,
        env: environment,
        debug: true,
      });
      return result;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("Debug logs:")) {
        const parts = err.message.split("Debug logs:\n");
        setTransactionLogs(parts[1]?.split("\n") || []);
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
    [provider, address, amount, btcAddress, tokenMint, environment],
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
              <strong>BTC Address:</strong> {btcAddress || <em>Not set</em>}
            </p>
            {tokenMint && (
              <p>
                <strong>Token Mint Override:</strong> {tokenMint}
              </p>
            )}
          </SectionCard>

          <div className="d-grid gap-2 my-4">
            <Button
              primary
              size="large"
              onClick={handleRedeem}
              isLoading={isLoading}
              actionName={redeemForBtc.name}
            />
          </div>

          {txHash && (
            <ResultDisplay
              result={txHash}
              title="Redeem Transaction Hash"
              successMessage="Success! BTC.b → BTC redemption transaction submitted."
            />
          )}
          {(error || connectError) && (
            <ErrorDisplay error={error || connectError} title="Redeem Error" />
          )}

          {transactionLogs && transactionLogs.length > 0 && (
            <SectionCard title="Transaction Logs (Debug)">
              <CodeBlock text={transactionLogs.join("\n")} />
            </SectionCard>
          )}
        </>
      )}
    </>
  );
};

const meta: Meta<typeof StoryView> = {
  title: "write/redeemForBtc (Asset Router)",
  component: StoryView,
  tags: ["autodocs"],
  decorators: [functionType("write")],
  parameters: {
    docs: {
      description: {
        component: `Demonstrates redeeming BTC.b → BTC via the Asset Router's \`redeem_for_btc\` instruction.

**Flow:**
1. Connect a Solana wallet holding BTC.b tokens
2. Enter the destination Bitcoin address and amount (in satoshis)
3. Call \`redeemForBtc\` — burns BTC.b and sends a GMP message through the Mailbox
4. The Lombard protocol processes the GMP message and sends BTC to the specified address`,
      },
    },
  },
  args: {
    environment: Env.stage,
    amount: "0.0002",
    btcAddress: "",
    tokenMint: "",
  },
  argTypes: {
    environment: {
      control: { type: "select" },
      options: Object.values(Env),
    },
    amount: {
      control: { type: "text" },
      description: "Amount to redeem in BTC (e.g. 0.0002)",
    },
    btcAddress: {
      control: { type: "text" },
      description: "Destination Bitcoin address (taproot, segwit, etc.)",
    },
    tokenMint: {
      control: { type: "text" },
      description: "BTC.b mint address override (leave empty for default)",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;
