import { Env } from '@lombard.finance/sdk-common';
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { DefiProtocol } from '../../defi/defi-registry';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { ConnectButton } from '../../stories/components/ConnectButton';
import {
  functionType,
  wagmiDecorator } from '../../stories/components/decorators';
import {
  canPerformAction,
  useConnection } from '../../stories/hooks/useConnection';
import useQuery from '../../stories/hooks/useQuery';
import { Token } from '../../tokens/token-addresses';
import { ISignStakeAndBakeParams, signStakeAndBake } from './signStakeAndBake';

const meta = {
  title: 'write/signStakeAndBake',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [wagmiDecorator, functionType('write')],
  argTypes: {
    token: {
      options: ['BTC', Token.LBTC, Token.BTCb],
      control: { type: 'select' },
      description:
        'Token to stake (BTC converts to LBTC, BTCb uses approve mode)' },
    vault: {
      options: Object.values(DefiProtocol),
      control: { type: 'select' },
      description: 'Vault to stake into (Veda: LBTC/BTC, Silo: BTCb)' },
    env: {
      options: [Env.prod, Env.testnet, Env.stage, Env.dev],
      control: { type: 'select' },
      description: 'Environment (affects contract addresses)' },
    value: {
      control: { type: 'text' },
      description: 'Amount to stake (in token units)' } } } satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PermitFlow_LBTC_Ethereum: Story = {
  name: 'Permit Flow: LBTC on Ethereum',
  args: {
    value: '10000',
    token: Token.LBTC,
    vault: DefiProtocol.Veda,
    env: Env.prod } };

export const PermitFlow_BTC_Ethereum: Story = {
  name: 'Permit Flow: BTC to LBTC on Ethereum',
  args: {
    value: '10000',
    token: 'BTC',
    vault: DefiProtocol.Veda,
    env: Env.prod } };

export const ApproveFlow_BTCb_Fuji: Story = {
  name: 'Approve Flow: BTCb on Avalanche Fuji',
  args: {
    value: '5000',
    token: Token.BTCb,
    vault: DefiProtocol.Silo,
    env: Env.testnet } };

type SignStakeAndBakeParams = Omit<
  ISignStakeAndBakeParams,
  'account' | 'chainId' | 'provider'
> & {
  vault?: DefiProtocol;
  env?: Env;
};

export function StoryView(props: SignStakeAndBakeParams) {
  const connection = useConnection();
  const [showRawData, setShowRawData] = useState(false);

  const request = async () => {
    if (!canPerformAction(connection)) {
      alert('Not connected.');
      return;
    }

    return signStakeAndBake({
      value: props.value,
      expiry: props.expiry,
      token: props.token,
      vaultKey: props.vault || DefiProtocol.Veda,
      account: connection.account.address,
      chainId: connection.account.chainId,
      provider: connection.provider,
      env: props.env || Env.stage });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <p>
        Generates a signature that allows Lombard to claim specified amount of
        BTC and deposit the equivalent LBTC amount (calculated using current
        ratio) automatically to the DeFi vault.
      </p>

      <p>
        <strong>Note:</strong> Pass the original BTC amount directly. The
        function automatically calculates the correct LBTC amount using the
        current exchange ratio.
      </p>

      {props.token === Token.BTCb && (
        <p className="text-danger">
          <strong>Important:</strong> BTCb uses on-chain approve. You'll need to
          sign a transaction and pay gas fees. Make sure you're on Avalanche
          Fuji testnet.
        </p>
      )}

      <div className="mb-4">
        <ConnectButton />
      </div>

      <Button
        onClick={refetch}
        disabled={isLoading || !connection.account.address}
        isLoading={isLoading}
        actionName={signStakeAndBake.name}
      />

      {!showRawData && data && (
        <div className="mt-4">
          <p>
            <strong>Mode:</strong> {data.mode}
          </p>
          {data.mode === 'permit' && (
            <p>
              <strong>Signature:</strong> <code>{data.signature}</code>
            </p>
          )}
          {data.mode === 'approve' && data.approvalTxHash && (
            <p>
              <strong>Transaction Hash:</strong>{' '}
              <code>{data.approvalTxHash}</code>
            </p>
          )}
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary mt-2"
            onClick={() => {
              setShowRawData(true);
            }}
          >
            Show full response
          </button>
        </div>
      )}

      {showRawData && data && (
        <>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary mt-3 mb-2"
            onClick={() => {
              setShowRawData(false);
            }}
          >
            Hide full response
          </button>
          <CodeBlock
            text={{
              mode: data.mode,
              signature: data.signature,
              approvalTxHash: data.approvalTxHash,
              typedData: data.typedData ? JSON.parse(data.typedData) : '' }}
          />
        </>
      )}

      {error && <CodeBlock text={error} />}
    </>
  );
}
