import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import type { Meta, StoryObj } from '@storybook/react';
import { ChainId } from '../../common/chains';
import { chainSelector } from '../../stories/arg-types';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { functionType } from '../../stories/components/decorators';
import { EXAMPLE_EVM_ADDRESS } from '../../stories/constants';
import useQuery from '../../stories/hooks/useQuery';
import {
  IGetNetworkFeeSignatureParams,
  getNetworkFeeSignature,
} from './getNetworkFeeSignature';

const meta = {
  title: 'api/getNetworkFeeSignature',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('api-get')],
  argTypes: { ...chainSelector },
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    address: EXAMPLE_EVM_ADDRESS,
    chainId: ChainId.ethereum,
    env: DEFAULT_ENV,
  },
};

type GetNetworkFeeSignatureParamsProps = IGetNetworkFeeSignatureParams;

export function StoryView(props: GetNetworkFeeSignatureParamsProps) {
  const request = async () => {
    return await getNetworkFeeSignature({
      ...props,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getNetworkFeeSignature.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
