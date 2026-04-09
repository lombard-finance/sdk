import { DEFAULT_ENV } from "@lombard.finance/sdk-common";
import type { Meta, StoryObj } from "@storybook/react";

import { ChainId } from "../../common/chains";
import { envSelector } from "../../stories/arg-types";
import { Button } from "../../stories/components/Button";
import { CodeBlock } from "../../stories/components/CodeBlock";
import { functionType } from "../../stories/components/decorators";
import useQuery from "../../stories/hooks/useQuery";
import { toSatoshi } from "../../utils/satoshi";
import {
  getLBTCExchangeRate,
  IgetLBTCExchangeRateParams,
} from "./getLBTCExchangeRate";

const meta = {
  title: "api/getLBTCExchangeRate",
  component: StoryView,
  tags: ["autodocs"],
  decorators: [functionType("api-get")],
  argTypes: { ...envSelector },
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithDefaults: Story = {
  args: {
    amount: toSatoshi(1).toNumber(),
    chainId: ChainId.ethereum,
    env: DEFAULT_ENV,
  },
};

export function StoryView(props: IgetLBTCExchangeRateParams) {
  const { data, error, isLoading, refetch } = useQuery(
    async () => await getLBTCExchangeRate(props),
    [props],
    false,
  );

  return (
    <>
      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getLBTCExchangeRate.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
