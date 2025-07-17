import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { functionType } from '../../stories/components/decorators';
import { EXAMPLE_EVM_ADDRESS } from '../../stories/constants';
import useQuery from '../../stories/hooks/useQuery';
import {
  IStoreNetworkFeeSignatureParams,
  storeNetworkFeeSignature,
} from './storeNetworkFeeSignature';

const meta = {
  title: 'api/storeNetworkFeeSignature',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('api-post')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    address: EXAMPLE_EVM_ADDRESS,
    signature: '0x... YOUR SIGNATURE GOES HERE',
    typedData: '{ ... } YOUR TYPED DATA GOES HERE',
    env: DEFAULT_ENV,
  },
};

type StoreNetworkFeeSignatureProps = IStoreNetworkFeeSignatureParams;

export function StoryView(props: StoreNetworkFeeSignatureProps) {
  const request = async () => {
    return storeNetworkFeeSignature({
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
        actionName={storeNetworkFeeSignature.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
