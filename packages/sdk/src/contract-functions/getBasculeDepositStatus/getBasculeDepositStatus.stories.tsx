import type { Meta, StoryObj } from '@storybook/react';
import { ChainId } from '../../common/chains';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { functionType } from '../../stories/components/decorators';
import useQuery from '../../stories/hooks/useQuery';
import {
  IGetBasculeDepositStatusParameters,
  getBasculeDepositStatus,
} from './getBasculeDepositStatus';
import {
  chainSelector,
  envSelector,
  makeTokenSelector,
} from '../../stories/arg-types';
import { Token } from '../../tokens/token-addresses';

const meta = {
  title: 'read/getBasculeDepositStatus',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('read')],
  argTypes: {
    ...chainSelector,
    ...envSelector,
    ...makeTokenSelector([Token.LBTC, Token.BTCb, Token.BTCK]),
  },
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParams: Story = {
  args: {
    rawPayload:
      'e288fb4a022d9999f6a62cd3401ba6e03ae710a1b3fcd8a77325b435371108676e600a5f000000000000000000000000000000000000000000000000000000000000002200000000000000000000000089e3e4e7a699d6f131d893aeef7ee143706ac23a0000000000000000000000009ece5fb1ab62d9075c4ec814b321e24d8ea021ac000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000064155b6b13000000000000000000000000ecac9c5f704e954931349da37f60e39f515c11c1000000000000000000000000659579f1460c38c3ce3288b47b074646cef855fc0000000000000000000000000000000000000000000000000000000000004df800000000000000000000000000000000000000000000000000000000',
    chainId: ChainId.katana,
  },
};

export function StoryView(props: IGetBasculeDepositStatusParameters) {
  const request = async () => {
    return getBasculeDepositStatus(props);
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getBasculeDepositStatus.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
