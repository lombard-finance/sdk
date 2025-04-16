import type { Meta, StoryObj } from '@storybook/react';
import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import useQuery from '../../stories/hooks/useQuery';
import {
  IGetUserStakeAndBakeSignatureParams,
  getUserStakeAndBakeSignature,
} from './getUserStakeAndBakeSignature';
import { ChainId } from '../../common/chains';
import { EXAMPLE_EVM_ADDRESS } from '../../stories/constants';
import { functionType } from '../../stories/components/decorators';

const meta = {
  title: 'api/getUserStakeAndBakeSignature',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('api-get')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    userDestinationAddress: EXAMPLE_EVM_ADDRESS,
    chainId: ChainId.ethereum,
    env: DEFAULT_ENV,
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
