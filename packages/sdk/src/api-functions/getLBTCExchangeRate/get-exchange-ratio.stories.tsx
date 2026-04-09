import { DEFAULT_ENV } from "@lombard.finance/sdk-common";
import type { Meta, StoryObj } from "@storybook/react";

import { envSelector } from "../../stories/arg-types";
import { Button } from "../../stories/components/Button";
import { CodeBlock } from "../../stories/components/CodeBlock";
import { functionType } from "../../stories/components/decorators";
import useQuery from "../../stories/hooks/useQuery";
import { getExchangeRatio } from "./get-exchange-ratio";

const meta = {
  title: "api/getExchangeRatio",
  component: StoryView,
  tags: ["autodocs"],
  decorators: [functionType("api-get")],
  argTypes: { ...envSelector },
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithDefaults: Story = {
  args: {
    env: DEFAULT_ENV,
  },
};

export function StoryView(props: Parameters<typeof getExchangeRatio>[0]) {
  const { data, error, isLoading, refetch } = useQuery(
    async () => await getExchangeRatio(props),
    [props],
    false,
  );

  return (
    <>
      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getExchangeRatio.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
