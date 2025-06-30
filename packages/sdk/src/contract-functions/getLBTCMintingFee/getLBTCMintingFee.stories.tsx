import type { Meta, StoryObj } from '@storybook/react';
import { ChainId } from '../../common/chains';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { functionType } from '../../stories/components/decorators';
import useQuery from '../../stories/hooks/useQuery';
import { getLBTCMintingFee } from './getLBTCMintingFee';
import { chainSelector, envSelector } from '../../stories/arg-types';
import { Env } from '@lombard.finance/sdk-common';

const meta = {
  title: 'read/getLBTCMintingFee',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('read')],
  argTypes: { ...chainSelector, ...envSelector },
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Holesky: Story = {
  args: {
    chainId: ChainId.holesky,
    env: undefined,
  },
};

type Params = Parameters<typeof getLBTCMintingFee>[0];

export function StoryView(props: Params) {
  const request = async () => {
    return getLBTCMintingFee({
      chainId: props.chainId,
      env: props.env,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <div>
      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getLBTCMintingFee.name}
      />

      <CodeBlock text={error || data?.toFormat()} />

      {data && (
        <div className="mt-4 p-4 border rounded">
          <h3 className="text-lg font-bold mb-2">Fee Details</h3>
          <p>Minting Fee: {data.toFormat()} BTC</p>
        </div>
      )}
    </div>
  );
}
