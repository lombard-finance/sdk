import type { Meta, StoryObj } from '@storybook/react';

import { ChainId } from '../common/chains';
import {
  chainSelector,
  envSelector,
  makeTokenSelector,
} from '../stories/arg-types';
import { Button } from '../stories/components/Button';
import { CodeBlock } from '../stories/components/CodeBlock';
import { functionType } from '../stories/components/decorators';
import useQuery from '../stories/hooks/useQuery';
import { Token } from './token-addresses';
import { getTokenInfo } from './tokens';

const meta = {
  title: 'tokens/getTokenInfo',
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

export const LBTCOnEthereum: Story = {
  args: {
    token: Token.LBTC,
    chainId: ChainId.ethereum,
    env: undefined,
  },
};

export const BTCbOnKatanaTatara: Story = {
  args: {
    token: Token.BTCb,
    chainId: ChainId.katanaTatara,
    env: undefined,
  },
};

export const LBTCOnBase: Story = {
  args: {
    token: Token.LBTC,
    chainId: ChainId.base,
    env: undefined,
  },
};

type GetTokenInfoProps = Parameters<typeof getTokenInfo>;

interface StoryViewProps {
  token: GetTokenInfoProps[0];
  chainId: GetTokenInfoProps[1];
  env: GetTokenInfoProps[2];
}

/**
 * Get token information including symbol, decimals, address, and ABI.
 *
 * This function retrieves comprehensive token metadata for a given token
 * on a specific chain. It automatically detects if the contract is upgraded
 * and returns the appropriate ABI.
 *
 * **Use Cases:**
 * - Display token information in your UI
 * - Validate token contracts before interactions
 * - Get the correct ABI for contract calls
 *
 * **Returns:**
 * - `address`: The token contract address
 * - `abi`: The appropriate ABI for the token
 * - `symbol`: Token symbol (e.g., "LBTC")
 * - `decimals`: Number of decimal places
 */
export function StoryView(props: StoryViewProps) {
  const request = async () => {
    return getTokenInfo(props.token, props.chainId, props.env);
  };

  const { data, error, isLoading, refetch } = useQuery(
    request,
    [props.token, props.chainId, props.env],
    false,
  );

  return (
    <div className="container">
      <div className="mb-3">
        <h3>Token Information Query</h3>
        <p className="text-muted">
          Retrieves token metadata including symbol, decimals, address, and ABI.
          Automatically detects upgraded contracts.
        </p>
      </div>

      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getTokenInfo.name}
      />

      {data && (
        <div className="mt-3">
          <h5>Result Preview:</h5>
          <ul>
            <li>
              <strong>Symbol:</strong> {data.symbol}
            </li>
            <li>
              <strong>Decimals:</strong> {data.decimals}
            </li>
            <li>
              <strong>Address:</strong> {data.address}
            </li>
            <li>
              <strong>ABI Functions:</strong> {data.abi.length}
            </li>
          </ul>
        </div>
      )}

      <CodeBlock text={error || data} />
    </div>
  );
}
