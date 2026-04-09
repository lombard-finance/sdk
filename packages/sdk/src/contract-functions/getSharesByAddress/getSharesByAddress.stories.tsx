import type { Meta, StoryObj } from "@storybook/react";

import { ChainId } from "../../common/chains";
import { Button } from "../../stories/components/Button";
import { CodeBlock } from "../../stories/components/CodeBlock";
import { functionType } from "../../stories/components/decorators";
import { EXAMPLE_EVM_ADDRESS } from "../../stories/constants";
import useQuery from "../../stories/hooks/useQuery";
import { Vault } from "../../vaults/lib/config";
import {
  getSharesByAddress,
  IGetSharesByAddressParameters,
} from "./getSharesByAddress";

const meta = {
  title: "read/getSharesByAddress",
  component: StoryView,
  tags: ["autodocs"],
  decorators: [functionType("read")],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    chainId: ChainId.ethereum,
    address: EXAMPLE_EVM_ADDRESS,
    vaultKey: Vault.Veda,
  },
};

export function StoryView(props: IGetSharesByAddressParameters) {
  const request = async () => {
    return getSharesByAddress({
      ...props,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <div>
      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getSharesByAddress.name}
      />

      <CodeBlock text={error || data} />

      {data && (
        <div className="mt-4 p-4 border rounded">
          <h3 className="text-lg font-bold mb-2">Vault shares owned</h3>
          <p>
            <b>{data.balance.toString()}</b> Vault shares ={" "}
            {data.balanceLbtc.toString()} LBTC
          </p>
        </div>
      )}
    </div>
  );
}
