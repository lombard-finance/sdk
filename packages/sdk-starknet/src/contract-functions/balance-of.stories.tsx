import type { Meta, StoryObj } from '@storybook/react';
import { balanceOf } from './balance-of';
import { Token } from '../tokens/lib/tokens';
import { functionType } from '../stories/components/decorators';
import { Button } from '../stories/components/Button';
import { CodeBlock } from '../stories/components/CodeBlock';
import useQuery from '../stories/hooks/use-query';
import { StarknetChainId } from '../utils/chains';

const meta = {
  title: 'read/balance-of',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('read')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    account:
      '0x0222cad4d720e1693277a3cc426ae81199ff808f86c10b6dffd946b37f5953d7',
    token: Token.LBTC,
    chainId: StarknetChainId.SN_SEPOLIA,
  },
};

type Props = Parameters<typeof balanceOf>[0];

export function StoryView(props: Props) {
  const request = async () => {
    return balanceOf({
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
        actionName={balanceOf.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
