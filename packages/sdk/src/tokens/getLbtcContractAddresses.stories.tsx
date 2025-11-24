import { Env } from '@lombard.finance/sdk-common';
import type { Meta, StoryObj } from '@storybook/react';
import { getChain } from '../common/chains';
import { envSelector } from '../stories/arg-types';
import { Button } from '../stories/components/Button';
import { CodeBlock } from '../stories/components/CodeBlock';
import { functionType } from '../stories/components/decorators';
import useQuery from '../stories/hooks/useQuery';
import { getLbtcContractAddresses } from './lbtc-addresses';

const meta = {
  title: 'tokens/getLbtcContractAddresses',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('read')],
  argTypes: {
    ...envSelector,
  },
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Production: Story = {
  args: {
    env: undefined,
  },
};

export const Testnet: Story = {
  args: {
    env: 'testnet',
  },
};

export const Development: Story = {
  args: {
    env: 'dev',
  },
};

interface StoryViewProps {
  env?: Env;
}

/**
 * Get all LBTC contract addresses for a specific environment.
 * 
 * This function returns a complete mapping of LBTC contract addresses
 * across all supported EVM chains for a given environment (prod, testnet, dev).
 * 
 * **Environments:**
 * - `prod`: Production/mainnet addresses
 * - `testnet`: Public testnet addresses
 * - `stage`: Staging environment
 * - `dev`: Development environment
 * - `ibc`: IBC environment
 * 
 * **Supported Chains:**
 * - Ethereum
 * - Base
 * - Avalanche
 * - Berachain
 * - Binance Smart Chain
 * - BOB
 * - Corn
 * - Etherlink
 * - Katana
 * - Morph
 * - Sonic
 * - Swell
 * - TAC
 * - And their testnets
 * 
 * **Use Cases:**
 * - Display all deployment addresses
 * - Validate contract addresses
 * - Multi-chain integration setup
 * - Configuration management
 * 
 * **Returns:**
 * Object mapping ChainId to contract Address
 */
export function StoryView(props: StoryViewProps) {
  const request = async () => {
    return getLbtcContractAddresses(props.env);
  };

  const { data, error, isLoading, refetch } = useQuery(
    request,
    [props.env],
    false,
  );

  // Count deployed chains
  const deployedChains = data ? Object.keys(data).length : 0;

  return (
    <div className="container">
      <div className="mb-3">
        <h3>LBTC Contract Addresses</h3>
        <p className="text-muted">
          Retrieve all LBTC contract addresses across supported chains for a
          specific environment.
        </p>
      </div>

      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={getLbtcContractAddresses.name}
      />

      {data && (
        <div className="mt-3">
          <div className="alert alert-info">
            <strong>Deployed Chains:</strong> {deployedChains}
          </div>

          <h5>Chain Deployments:</h5>
          <div className="card">
            <div className="card-body">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Chain</th>
                    <th>Address</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data).map(([chainId, address]) => {
                    const chain = getChain(Number(chainId));
                    return (
                      <tr key={chainId}>
                        <td>
                          <strong>{chain?.name || 'Unknown'}</strong> (
                          {chainId})
                        </td>
                        <td>
                          <code className="text-break">{address}</code>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <CodeBlock text={error || data} />
    </div>
  );
}

