import { Env } from '@lombard.finance/sdk-common';
import type { Meta, StoryObj } from '@storybook/react';

import { ChainId } from '../common/chains';
import {
  chainSelector,
  envSelector,
  makeTokenSelector } from '../stories/arg-types';
import { Button } from '../stories/components/Button';
import { CodeBlock } from '../stories/components/CodeBlock';
import { functionType } from '../stories/components/decorators';
import useQuery from '../stories/hooks/useQuery';
import { AddressKind, Token } from './token-addresses';
import { getTokenContractInfo } from './tokens';

const meta = {
  title: 'tokens/getTokenContractInfo',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('read')],
  argTypes: {
    ...chainSelector,
    ...envSelector,
    ...makeTokenSelector([Token.LBTC, Token.BTCb, Token.BTCK]),
    addressKind: {
      options: Object.values(AddressKind),
      control: { type: 'select' } } } } satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LBTCTokenAddress: Story = {
  args: {
    token: Token.LBTC,
    chainId: ChainId.ethereum,
    env: undefined,
    addressKind: AddressKind.Token } };

export const BTCbAdapterAddress: Story = {
  args: {
    token: Token.BTCb,
    chainId: ChainId.avalancheFuji,
    env: undefined,
    addressKind: AddressKind.Adapter } };

export const BTCbTokenAddress: Story = {
  args: {
    token: Token.BTCb,
    chainId: ChainId.avalancheFuji,
    env: undefined,
    addressKind: AddressKind.Token } };

interface StoryViewProps {
  token: Token;
  chainId: ChainId;
  env?: Env;
  addressKind: AddressKind;
}

/**
 * Get token contract information with the appropriate ABI.
 *
 * This function returns the contract address, ABI, and chain ID for a token.
 * It automatically selects the correct ABI based on whether the contract has
 * been upgraded to the new version.
 *
 * **Address Kinds:**
 * - `Token`: The token contract address (default)
 * - `Adapter`: The bridge adapter address (for BTCb on Avalanche)
 *
 * **Use Cases:**
 * - Prepare contract calls with the correct ABI
 * - Get bridge adapter addresses for cross-chain operations
 * - Verify contract addresses before transactions
 *
 * **Contract Upgrades:**
 * - LBTC: May use either LBTC_ABI or STLBTC_ABI
 * - BTCK: May use either BTCK_ABI or NATIVE_LBTC_ABI
 * - BTCb: Uses NATIVE_LBTC_ABI or BRIDGE_TOKEN_ADAPTER_ABI
 */
export function StoryView(props: StoryViewProps) {
  const request = async () => {
    return getTokenContractInfo(
      props.token,
      props.chainId,
      props.env,
      props.addressKind,
    );
  };

  const { data, error, isLoading, refetch } = useQuery(
    request,
    [props.token, props.chainId, props.env, props.addressKind],
    false,
  );

  return (
    <div className="container">
      <div className="mb-3">
        <h3>Token Contract Information</h3>
        <p className="text-muted">
          Retrieves contract address, ABI, and chain ID. Supports both token and
          adapter addresses for bridge operations.
        </p>
      </div>

      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getTokenContractInfo.name}
      />

      {data && (
        <div className="mt-3">
          <h5>Result Preview:</h5>
          <ul>
            <li>
              <strong>Address:</strong> {data.address}
            </li>
            <li>
              <strong>Chain ID:</strong> {data.chainId}
            </li>
            <li>
              <strong>ABI Functions:</strong> {data.abi.length}
            </li>
            <li>
              <strong>Address Kind:</strong> {props.addressKind}
            </li>
          </ul>
        </div>
      )}

      <CodeBlock text={error || data} />
    </div>
  );
}
