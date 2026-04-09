import { DEFAULT_ENV } from "@lombard.finance/sdk-common";
import type { Meta, StoryObj } from "@storybook/react";

import { ChainId } from "../../common/chains";
import { Button } from "../../stories/components/Button";
import { CodeBlock } from "../../stories/components/CodeBlock";
import { functionType } from "../../stories/components/decorators";
import { EXAMPLE_EVM_ADDRESS } from "../../stories/constants";
import useQuery from "../../stories/hooks/useQuery";
import {
  getUserStakeAndBakeSignature,
  IGetUserStakeAndBakeSignatureParams,
} from "./getUserStakeAndBakeSignature";

const meta = {
  title: "api/getUserStakeAndBakeSignature",
  component: StoryView,
  tags: ["autodocs"],
  decorators: [functionType("api-get")],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    userDestinationAddress: EXAMPLE_EVM_ADDRESS,
    chainId: ChainId.ethereum,
    env: DEFAULT_ENV,
  },
  argTypes: {
    chainId: {
      mapping: ChainId,
      options: Object.keys(ChainId),
      description: "The chain",
      control: { type: "select" },
    },
  },
};

type GetUserStakeAndBakeSignatureProps = IGetUserStakeAndBakeSignatureParams;

export function StoryView(props: GetUserStakeAndBakeSignatureProps) {
  const request = async () => {
    return getUserStakeAndBakeSignature({
      ...props,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <p>
        This method gets the user's stake and bake signature from the API. The
        signature is used to approve spending of tokens.
      </p>

      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getUserStakeAndBakeSignature.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
