import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { functionType } from '../../stories/components/decorators';
import useQuery from '../../stories/hooks/useQuery';
import { IGetPermitNonceParams, getPermitNonce } from './getPermitNonce';

const meta = {
  title: 'read/getPermitNonce',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('read')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    owner: '0x1234567890123456789012345678901234567890',
    chainId: 1,
  },
};

type GetPermitNonceProps = Parameters<typeof getPermitNonce>[0];

export function StoryView(props: GetPermitNonceProps) {
  const request = async () => {
    return getPermitNonce(props);
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getPermitNonce.name}
      />

      <CodeBlock text={error || data} />

      {data && (
        <div className="mt-4 p-4 border rounded">
          <h3 className="text-lg font-bold mb-2">Permit Nonce Details</h3>
          <p>Owner: {props.owner}</p>
          <p>Nonce: {data}</p>
        </div>
      )}
    </>
  );
}
