import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { functionType } from '../../stories/components/decorators';
import useQuery from '../../stories/hooks/useQuery';
import {
  IStoreStakeAndBakeSignatureParams,
  storeStakeAndBakeSignature } from './storeStakeAndBakeSignature';

const meta = {
  title: 'api/storeStakeAndBakeSignature',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('api-post')] } satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    signature: '0x... YOUR SIGNATURE GOES HERE',
    typedData: '{ ... } YOUR TYPED DATA GOES HERE' } };

type SignStakeAndBakeParams = IStoreStakeAndBakeSignatureParams;

export function StoryView(props: SignStakeAndBakeParams) {
  const request = async () => {
    return await storeStakeAndBakeSignature({
      ...props });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <p>
        This method signs and stores the stake and bake signature in the
        backend. The signature is used to approve spending of tokens.
      </p>

      <Button
        onClick={refetch}
        isLoading={isLoading}
        actionName={storeStakeAndBakeSignature.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
