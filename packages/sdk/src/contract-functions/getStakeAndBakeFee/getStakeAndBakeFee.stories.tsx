import { Env } from '@lombard.finance/sdk-common';
import type { Meta, StoryObj } from '@storybook/react';

import { ChainId } from '../../common/chains';
import { DefiProtocol } from '../../defi/defi-registry';
import { Button } from '../../stories/components/Button';
import { CodeBlock } from '../../stories/components/CodeBlock';
import { functionType } from '../../stories/components/decorators';
import useQuery from '../../stories/hooks/useQuery';
import { Token } from '../../tokens/token-addresses';
import { VEDA_VAULT_STAKE_AND_BAKE_CHAINS } from '../../vaults/lib/config';
import {
  IGetStakeAndBakeFeeParams,
  getStakeAndBakeFee,
} from './getStakeAndBakeFee';

const meta = {
  title: 'read/getStakeAndBakeFee',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('read')],
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const VedaDefaultToken: Story = {
  args: {
    protocol: DefiProtocol.Veda,
    chainId: ChainId.ethereum,
    env: Env.prod,
  },
  argTypes: {
    protocol: {
      options: Object.values(DefiProtocol),
      control: { type: 'select' },
      description: 'The DeFi protocol (Veda or Silo)',
    },
    chainId: {
      mapping: ChainId,
      options: VEDA_VAULT_STAKE_AND_BAKE_CHAINS.map(
        ch => Object.entries(ChainId).find(([_, v]) => v === ch)?.[0],
      ),
      description: 'The chain',
      control: { type: 'select' },
    },
    env: {
      options: [Env.prod, Env.testnet, Env.stage, Env.dev],
      control: { type: 'select' },
      description: 'Environment',
    },
  },
};

export const VedaExplicitToken: Story = {
  args: {
    protocol: DefiProtocol.Veda,
    token: Token.LBTC,
    chainId: ChainId.ethereum,
    env: Env.prod,
  },
  argTypes: {
    protocol: {
      options: Object.values(DefiProtocol),
      control: { type: 'select' },
      description: 'The DeFi protocol',
    },
    token: {
      options: [Token.LBTC, 'BTC'],
      control: { type: 'select' },
      description: 'The token (LBTC or BTC for Veda)',
    },
    chainId: {
      mapping: ChainId,
      options: VEDA_VAULT_STAKE_AND_BAKE_CHAINS.map(
        ch => Object.entries(ChainId).find(([_, v]) => v === ch)?.[0],
      ),
      description: 'The chain',
      control: { type: 'select' },
    },
    env: {
      options: [Env.prod, Env.testnet, Env.stage, Env.dev],
      control: { type: 'select' },
      description: 'Environment',
    },
  },
};

export const SiloDefaultToken: Story = {
  args: {
    protocol: DefiProtocol.Silo,
    chainId: ChainId.avalancheFuji,
    env: Env.testnet,
  },
  argTypes: {
    protocol: {
      options: Object.values(DefiProtocol),
      control: { type: 'select' },
      description: 'The DeFi protocol (Veda or Silo)',
    },
    chainId: {
      options: ['avalancheFuji'],
      mapping: { avalancheFuji: ChainId.avalancheFuji },
      control: { type: 'select' },
      description: 'The chain (Silo only supports Avalanche Fuji in testnet)',
    },
    env: {
      options: [Env.testnet],
      control: { type: 'select' },
      description: 'Environment (Silo only available in testnet)',
    },
  },
};

export const SiloExplicitToken: Story = {
  args: {
    protocol: DefiProtocol.Silo,
    token: Token.BTCb,
    chainId: ChainId.avalancheFuji,
    env: Env.testnet,
  },
  argTypes: {
    protocol: {
      options: Object.values(DefiProtocol),
      control: { type: 'select' },
      description: 'The DeFi protocol',
    },
    token: {
      options: [Token.BTCb],
      control: { type: 'select' },
      description: 'The token (BTCb for Silo)',
    },
    chainId: {
      options: ['avalancheFuji'],
      mapping: { avalancheFuji: ChainId.avalancheFuji },
      control: { type: 'select' },
      description: 'The chain (Silo only supports Avalanche Fuji in testnet)',
    },
    env: {
      options: [Env.testnet],
      control: { type: 'select' },
      description: 'Environment (Silo only available in testnet)',
    },
  },
};

type GetStakeAndBakeFeeProps = IGetStakeAndBakeFeeParams;

export function StoryView(props: GetStakeAndBakeFeeProps) {
  const request = async () => {
    return getStakeAndBakeFee({
      ...props,
    });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  const value = data?.toFixed();

  return (
    <div>
      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getStakeAndBakeFee.name}
      />

      <CodeBlock text={error || data?.toString()} />

      {data && (
        <div className="mt-4 p-4 border rounded">
          <h3 className="text-lg font-bold mb-2">Fee Details</h3>
          <p>Stake and Bake Fee: {value} LBTC</p>
        </div>
      )}
    </div>
  );
}
