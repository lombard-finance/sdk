import { Env } from "@lombard.finance/sdk-common";
import type { Meta, StoryObj } from "@storybook/react";

import { ChainId } from "../../common/chains";
import { chainSelector } from "../../stories/arg-types";
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
import { Vault, VAULTS } from "../../vaults/lib/config";
import { approveLBTC, IApproveLBTCParams } from "./approveLBTC";

const meta = {
  title: "write/approveLBTC",
  component: StoryView,
  tags: ["autodocs"],
  decorators: [wagmiDecorator, functionType("write")],
  argTypes: { ...chainSelector },
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    chainId: ChainId.sepolia,
    spender: VAULTS[Vault.Veda].spenderContracts[ChainId.sepolia]?.address,
    amount: 0.00001,
    env: Env.stage,
  },
};

type Props = Omit<IApproveLBTCParams, "account" | "provider">;

export function StoryView(props: Props) {
  const connection = useConnection();

  const request = async () => {
    if (!canPerformAction(connection)) {
      return;
    }

    return approveLBTC({
      ...props,

      account: connection.account.address,
      // chainId: connection.account.chainId,
      provider: connection.provider,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <div className="mb-4">
        <ConnectButton />
      </div>

      <Button
        onClick={refetch}
        disabled={isLoading || !connection.account.address}
        isLoading={isLoading}
        actionName={approveLBTC.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
