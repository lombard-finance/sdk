import type { Meta, StoryObj } from '@storybook/react';
import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import { ChainId } from '../../common/chains';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { EXAMPLE_EVM_ADDRESS } from '../../stories/constants';
import useQuery from '../../stories/hooks/useQuery';
import {
  generateDepositBtcAddress,
  IGenerateDepositBtcAddressParams,
} from './generateDepositBtcAddress';
import { functionType } from '../../stories/components/decorators';
import { chainSelector, makeTokenSelector } from '../../stories/arg-types';
import { Token } from '../../tokens/token-addresses';

const meta = {
  title: 'api/generateDepositBtcAddress',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('api-post')],
  argTypes: {
    ...chainSelector,
    ...makeTokenSelector([Token.LBTC, Token.BTCK]),
  },
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

const d = {
  signature:
    '0x9ca1c54532b42da150d7e1c87a55d2601a245d2a34f5c442e40d2793e2e7b739095cd1213aadd45db96d8459dd3a612daa01a08f661a5d67290bd806e4862f101c',
  typedData:
    '{"account":"0x659579F1460c38C3ce3288b47b074646CEF855fc","domain":{"name":"Lombard Staked Bitcoin","version":"1","chainId":1,"verifyingContract":"0x8236a87084f8b84306f72007f36f2618a5634494"},"message":{"chainId":1,"fee":"1100","expiry":1746119680},"primaryType":"feeApproval","types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"feeApproval":[{"name":"chainId","type":"uint256"},{"name":"fee","type":"uint256"},{"name":"expiry","type":"uint256"}]}}',
};

export const WithParams: Story = {
  args: {
    address: EXAMPLE_EVM_ADDRESS,
    token: Token.LBTC,
    chainId: ChainId.ethereum,
    signature: d.signature,
    eip712Data: d.typedData,
    env: DEFAULT_ENV,
    referrerCode: '',
    partnerId: 'lombard',
  },
};

export function StoryView(props: IGenerateDepositBtcAddressParams) {
  const { data, error, isLoading, refetch } = useQuery(
    () => generateDepositBtcAddress(props),
    [props],
    false,
  );

  return (
    <>
      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={generateDepositBtcAddress.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
