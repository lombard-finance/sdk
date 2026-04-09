import { Meta, StoryObj } from "@storybook/react";

import { chainSelector } from "../stories/arg-types";
import { Button } from "../stories/components/Button";
import { CodeBlock } from "../stories/components/CodeBlock";
import { ConnectButton } from "../stories/components/ConnectButton";
import { functionType } from "../stories/components/decorators/function-type";
import { wagmiDecorator } from "../stories/components/decorators/wagmi-decorator";
import {
  canPerformAction,
  useConnection,
} from "../stories/hooks/useConnection";
import useQuery from "../stories/hooks/useQuery";
import { addChain, AddChainParameters, ChainId } from "./chains";

const meta = {
  title: "write/addChain",
  component: StoryView,
  tags: ["autodocs"],
  decorators: [wagmiDecorator, functionType("write")],
  argTypes: { ...chainSelector },
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    chainId: ChainId.ethereum,
  },
};

type Props = Omit<AddChainParameters, "provider">;

export function StoryView(props: Props) {
  const connection = useConnection();

  const request = async () => {
    if (!canPerformAction(connection)) {
      return;
    }

    return addChain({
      ...props,
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
        actionName={addChain.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
