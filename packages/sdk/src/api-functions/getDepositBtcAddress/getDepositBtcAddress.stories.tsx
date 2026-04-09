import { DEFAULT_ENV, Env } from "@lombard.finance/sdk-common";
import type { Meta, StoryObj } from "@storybook/react";
import { useCallback, useState } from "react";

import { ChainId, SOLANA_DEVNET_CHAIN } from "../../common/chains";
import { allChainSelector, makeTokenSelector } from "../../stories/arg-types";
import { Button } from "../../stories/components/Button";
import { CodeBlock } from "../../stories/components/CodeBlock";
import { functionType } from "../../stories/components/decorators";
import { EXAMPLE_EVM_ADDRESS } from "../../stories/constants";
import useQuery from "../../stories/hooks/useQuery";
import { Token } from "../../tokens/token-addresses";
import { getDepositBtcAddress } from "./getDepositBtcAddress";
import { IGetDepositBtcAddressParameters } from "./types";

// --- EVM story (original) ---

export function StoryView(props: IGetDepositBtcAddressParameters) {
  const { data, error, isLoading, refetch } = useQuery(
    () => getDepositBtcAddress(props),
    [props],
    false,
  );

  return (
    <>
      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getDepositBtcAddress.name}
      />
      <CodeBlock text={error || data} />
    </>
  );
}

// --- Solana story with wallet connect ---

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey: { toBase58: () => string };
  connect: () => Promise<{ publicKey: { toBase58: () => string } }>;
  disconnect: () => Promise<void>;
}

function getPhantom(): PhantomProvider | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w?.phantom?.solana ?? w?.solana ?? null;
}

interface SolanaGetStoryArgs {
  token: Token;
  chainId: string;
  env: Env;
  partnerId: string;
}

function SolanaGetStoryView({
  token,
  chainId,
  env,
  partnerId,
}: SolanaGetStoryArgs) {
  const [address, setAddress] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    setConnectError(null);
    const phantom = getPhantom();
    if (!phantom) {
      setConnectError("Phantom wallet not found. Please install it.");
      return;
    }
    try {
      const resp = await phantom.connect();
      setAddress(resp.publicKey.toBase58());
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    const phantom = getPhantom();
    if (phantom) await phantom.disconnect().catch(() => {});
    setAddress(null);
  }, []);

  const { data, error, isLoading, refetch } = useQuery(
    () => {
      if (!address) throw new Error("Connect wallet first.");
      return getDepositBtcAddress({
        address,
        token,
        chainId: chainId as typeof SOLANA_DEVNET_CHAIN,
        env,
        partnerId,
      });
    },
    [address, token, chainId, env, partnerId],
    false,
  );

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        {!address ? (
          <Button onClick={handleConnect}>Connect Phantom</Button>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontFamily: "monospace", fontSize: 13 }}>
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
            <Button size="small" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </div>
        )}
      </div>

      {connectError && (
        <div style={{ color: "red", marginBottom: 8, fontSize: 13 }}>
          {connectError}
        </div>
      )}

      {address && (
        <Button
          onClick={refetch}
          disabled={isLoading}
          isLoading={isLoading}
          actionName={getDepositBtcAddress.name}
        />
      )}

      <CodeBlock text={error || data} />
    </div>
  );
}

// --- Meta ---

const meta = {
  title: "api/getDepositBtcAddress",
  component: StoryView,
  tags: ["autodocs"],
  decorators: [functionType("api-get")],
  argTypes: {
    ...allChainSelector,
    ...makeTokenSelector([Token.LBTC, Token.BTCK, Token.BTCb]),
  },
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

// --- Stories ---

export const EVM: Story = {
  args: {
    token: Token.LBTC,
    address: EXAMPLE_EVM_ADDRESS,
    chainId: ChainId.ethereum,
    env: DEFAULT_ENV,
    partnerId: "lombard",
  },
};

export const SolanaBTCb: StoryObj<typeof SolanaGetStoryView> = {
  name: "Solana — BTC.b",
  render: (args) => <SolanaGetStoryView {...args} />,
  args: {
    token: Token.BTCb,
    chainId: SOLANA_DEVNET_CHAIN,
    env: Env.dev,
    partnerId: "test",
  },
  argTypes: {
    ...makeTokenSelector([Token.LBTC, Token.BTCb]),
  },
};

export const SolanaLBTC: StoryObj<typeof SolanaGetStoryView> = {
  name: "Solana — LBTC",
  render: (args) => <SolanaGetStoryView {...args} />,
  args: {
    token: Token.LBTC,
    chainId: SOLANA_DEVNET_CHAIN,
    env: Env.dev,
    partnerId: "test",
  },
  argTypes: {
    ...makeTokenSelector([Token.LBTC, Token.BTCb]),
  },
};
