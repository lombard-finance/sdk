import type { Meta, StoryObj } from "@storybook/react";

import {
  Button,
  ConnectButton,
  ErrorDisplay,
  ResultDisplay,
} from "../../stories/components";
import { functionType } from "../../stories/decorators/function-type";
import { useConnect } from "../../stories/hooks/useConnect";
import useQuery from "../../stories/hooks/useQuery";
import { SolanaNetwork } from "../../types";
import { SolanaSdkError } from "../../utils";
import { signLbtcDestinationAddrSolana } from "./signLbtcDestinationAddrSolana";

interface SignLbtcDestAddrStoryArgs {
  network: SolanaNetwork;
}

export const StoryView = ({ network }: SignLbtcDestAddrStoryArgs) => {
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
    try {
      const result = await signLbtcDestinationAddrSolana({
        provider,
        network: network,
      });
      return result.signature;
    } catch (err: unknown) {
      console.error("Error signing destination address:", err);
      throw err instanceof Error ? err : SolanaSdkError.wrap(err);
    }
  };

  const {
    data: signature,
    error: fetchError,
    isLoading,
    refetch: signDestinationAddress,
  } = useQuery(request, [provider, address, network], false);

  const error = fetchError || connectError;

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

      <p className="small text-muted mt-n2 mb-3 px-3">
        This signature links your connected Solana address (
        {address?.substring(0, 6)}...) to your future Bitcoin unstake requests
        on the chosen network.
      </p>

      <div className="d-grid gap-2 mb-4">
        <Button
          primary
          size="large"
          onClick={signDestinationAddress}
          isLoading={isLoading}
          disabled={isLoading || !isConnected}
          actionName={signLbtcDestinationAddrSolana.name}
        />
      </div>

      {signature && (
        <ResultDisplay
          result={signature}
          title="Signature"
          successMessage="Success! Address signed."
        />
      )}
      {error && <ErrorDisplay error={error} title="Sign Error" />}
      {!isConnected && (
        <p className="mt-3 text-warning">Connect wallet to sign address.</p>
      )}
    </>
  );
};

const meta: Meta<typeof StoryView> = {
  title: "write/signLbtcDestinationAddrSolana",
  component: StoryView,
  tags: ["autodocs"],
  decorators: [functionType("write")],
  parameters: {
    docs: {
      description: {
        component:
          "Demonstrates signing the connected Solana wallet address using `signLbtcDestinationAddrSolana`. This is often required before unstaking.",
      },
    },
  },
  args: {
    network: SolanaNetwork.devnet,
  },
  argTypes: {
    network: {
      control: { type: "select" },
      options: Object.values(SolanaNetwork),
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;
