import { Env } from "@lombard.finance/sdk-common";
import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../../stories/components/Button";
import { CodeBlock } from "../../stories/components/CodeBlock";
import { ConnectButton } from "../../stories/components/ConnectButton";
import {
  functionType,
  wagmiDecorator,
} from "../../stories/components/decorators";
import {
  canPerformAction,
  useConnection,
} from "../../stories/hooks/useConnection";
import useQuery from "../../stories/hooks/useQuery";
import { DAY, now, toUnix } from "../../utils/time";
import { ISignNetworkFeeParams, signNetworkFee } from "./signNetworkFee";

const meta = {
  title: "write/signNetworkFee",
  component: StoryView,
  tags: ["autodocs"],
  decorators: [wagmiDecorator, functionType("write")],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    fee: "1100",
    expiry: toUnix(now() + DAY),
    env: Env.prod,
  },
};

type SignNetworkFeeProps = Omit<
  ISignNetworkFeeParams,
  "account" | "chainId" | "provider"
>;

export function StoryView(props: SignNetworkFeeProps) {
  const connection = useConnection();

  const request = async () => {
    if (!canPerformAction(connection)) {
      return;
    }

    return signNetworkFee({
      ...props,

      account: connection.account.address,
      chainId: connection.account.chainId,
      provider: connection.provider,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <p>
        This method is used to get the signature of the Liquid BTC destination
        address. The signature is used for auto-mint feature.
      </p>

      <div className="mb-4">
        <ConnectButton />
      </div>

      <Button
        onClick={refetch}
        disabled={isLoading || !connection.account.address}
        isLoading={isLoading}
        actionName={signNetworkFee.name}
      />

      <div
        style={{
          padding: "20px 0 0",
          fontFamily: "monospace",
          fontSize: "0.8em",
        }}
      >
        <span style={{ fontWeight: "800" }}>24 hours from now:</span>{" "}
        {toUnix(now() + DAY)}
      </div>

      <CodeBlock text={error || data} />
    </>
  );
}
