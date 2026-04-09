import type { Meta, StoryObj } from "@storybook/react";

import { ChainId } from "../../common/chains";
import { chainSelector, envSelector } from "../../stories/arg-types";
import { Button } from "../../stories/components/Button";
import { CodeBlock } from "../../stories/components/CodeBlock";
import { functionType } from "../../stories/components/decorators";
import useQuery from "../../stories/hooks/useQuery";
import { getLBTCTotalSupply } from "./getLBTCTotalSupply";

const meta = {
  title: "read/getLBTCTotalSupply",
  component: StoryView,
  tags: ["autodocs"],
  decorators: [functionType("read")],
  argTypes: { ...chainSelector, ...envSelector },
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    chainId: ChainId.ethereum,
    env: undefined,
  },
};

type TotalSupplyLBTCProps = Parameters<typeof getLBTCTotalSupply>[0];

export function StoryView(props: TotalSupplyLBTCProps) {
  const request = async () => {
    return getLBTCTotalSupply(props);
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getLBTCTotalSupply.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
