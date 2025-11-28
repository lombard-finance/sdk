import { Env } from '@lombard.finance/sdk-common';
import type { Meta, StoryObj } from '@storybook/react';
import { ChainId } from '../common/chains';
import { chainSelector, envSelector } from '../stories/arg-types';
import { Button } from '../stories/components/Button';
import { CodeBlock } from '../stories/components/CodeBlock';
import { functionType } from '../stories/components/decorators';
import useQuery from '../stories/hooks/useQuery';
import { AddressKind, getTokenByAddress } from './token-addresses';

const meta = {
  title: 'tokens/getTokenByAddress',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('read')],
  argTypes: {
    ...chainSelector,
    ...envSelector,
    tokenAddress: {
      control: { type: 'text' },
      description: 'Token contract address',
    },
    addressKind: {
      options: Object.values(AddressKind),
      control: { type: 'select' },
    },
  },
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LBTCOnEthereum: Story = {
  args: {
    tokenAddress: '0x8236a87084f8b84306f72007f36f2618a5634494',
    chainId: ChainId.ethereum,
    env: undefined,
    addressKind: AddressKind.Token,
  },
};

export const LBTCOnBase: Story = {
  args: {
    tokenAddress: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
    chainId: ChainId.base,
    env: undefined,
    addressKind: AddressKind.Token,
  },
};

export const BTCbOnKatanaTatara: Story = {
  args: {
    tokenAddress: '0x20eA7b8ABb4B583788F1DFC738C709a2d9675681',
    chainId: ChainId.katanaTatara,
    env: undefined,
    addressKind: AddressKind.Token,
  },
};

export const UnknownToken: Story = {
  args: {
    tokenAddress: '0x0000000000000000000000000000000000000000',
    chainId: ChainId.ethereum,
    env: undefined,
    addressKind: AddressKind.Token,
  },
};

interface StoryViewProps {
  tokenAddress: string;
  chainId: ChainId;
  env?: Env;
  addressKind: AddressKind;
}

/**
 * Reverse lookup: find which token a contract address belongs to.
 *
 * This function searches through all known token addresses to identify
 * which Lombard token matches the given address on a specific chain.
 *
 * **Supported Tokens:**
 * - LBTC
 * - BTCb
 *
 * **Address Kinds:**
 * - `Token`: The token contract address (default)
 * - `Adapter`: The bridge adapter address (for BTCb on Avalanche)
 *
 * **Use Cases:**
 * - Identify tokens from transaction logs
 * - Validate if an address is a known Lombard token
 * - Display token metadata based on contract address
 * - Parse events from smart contracts
 *
 * **Returns:**
 * - Token enum if found (e.g., `Token.LBTC`)
 * - `undefined` if address is not a known token
 *
 * **Note:** The comparison is case-insensitive
 */
export function StoryView(props: StoryViewProps) {
  const request = async () => {
    const result = getTokenByAddress(
      props.tokenAddress,
      props.chainId,
      props.env,
      props.addressKind,
    );
    return result || 'Token not found';
  };

  const { data, error, isLoading, refetch } = useQuery(
    request,
    [props.tokenAddress, props.chainId, props.env, props.addressKind],
    false,
  );

  const isFound = data && data !== 'Token not found';

  return (
    <div className="container">
      <div className="mb-3">
        <h3>Token Address Reverse Lookup</h3>
        <p className="text-muted">
          Identify which Lombard token a contract address belongs to by
          searching through known addresses.
        </p>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <h5>Query Parameters</h5>
          <ul>
            <li>
              <strong>Address:</strong>{' '}
              <code className="text-break">{props.tokenAddress}</code>
            </li>
            <li>
              <strong>Chain ID:</strong> {props.chainId}
            </li>
            <li>
              <strong>Address Kind:</strong> {props.addressKind}
            </li>
          </ul>
        </div>
      </div>

      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getTokenByAddress.name}
      />

      {data && (
        <div className="mt-3">
          <div
            className={`alert ${isFound ? 'alert-success' : 'alert-warning'}`}
          >
            <strong>Result:</strong>{' '}
            {isFound ? `✅ Found: ${data}` : '⚠️ Token not found'}
          </div>
        </div>
      )}

      <CodeBlock text={error || data} />
    </div>
  );
}
