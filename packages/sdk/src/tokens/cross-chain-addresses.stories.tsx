import { Env } from '@lombard.finance/sdk-common';
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import {
  SOLANA_DEVNET_CHAIN,
  SOLANA_MAINNET_CHAIN,
  SOLANA_TESTNET_CHAIN,
  STARKNET_MAINNET_CHAIN,
  STARKNET_SEPOLIA_CHAIN,
  SUI_MAINNET_CHAIN,
  SUI_TESTNET_CHAIN,
} from '../common/chains';
import { envSelector } from '../stories/arg-types';
import { Button } from '../stories/components/Button';
import { CodeBlock } from '../stories/components/CodeBlock';
import { functionType } from '../stories/components/decorators';
import {
  getSolanaTokenAddress,
  getStarknetTokenAddress,
  getSuiTokenAddress,
} from './token-addresses';

const meta = {
  title: 'tokens/cross-chain-addresses',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('read')],
  argTypes: {
    ...envSelector,
    blockchain: {
      options: ['Sui', 'Solana', 'Starknet'],
      control: { type: 'select' },
    },
  },
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SuiMainnet: Story = {
  args: {
    blockchain: 'Sui',
    env: 'prod',
  },
};

export const SolanaMainnet: Story = {
  args: {
    blockchain: 'Solana',
    env: 'prod',
  },
};

export const StarknetMainnet: Story = {
  args: {
    blockchain: 'Starknet',
    env: 'prod',
  },
};

export const SuiTestnet: Story = {
  args: {
    blockchain: 'Sui',
    env: 'testnet',
  },
};

interface StoryViewProps {
  blockchain: 'Sui' | 'Solana' | 'Starknet';
  env?: Env;
}

/**
 * Get LBTC token addresses for non-EVM blockchains.
 *
 * Lombard tokens are deployed across multiple blockchain ecosystems.
 * These helper functions provide easy access to token addresses for:
 *
 * **Sui Network:**
 * - `getSuiTokenAddress(chainId, env)`
 * - Supported: Mainnet, Testnet
 * - Returns Sui package/object address
 *
 * **Solana:**
 * - `getSolanaTokenAddress(chainId, env)`
 * - Supported: Mainnet, Testnet, Devnet
 * - Returns SPL token mint address
 *
 * **Starknet:**
 * - `getStarknetTokenAddress(chainId, env, variant)`
 * - Supported: Mainnet, Sepolia
 * - Variants: 'token' (default), 'assetRouter'
 * - Returns Cairo contract address
 *
 * **Use Cases:**
 * - Cross-chain integrations
 * - Multi-wallet support
 * - Token verification on different chains
 * - SDK initialization for non-EVM chains
 *
 * **Returns:**
 * - String address if deployed
 * - `undefined` if not deployed on that chain/environment
 */
export function StoryView(props: StoryViewProps) {
  const [results, setResults] = useState<Record<string, string | undefined>>(
    {},
  );

  const handleFetch = () => {
    const newResults: Record<string, string | undefined> = {};

    if (props.blockchain === 'Sui') {
      newResults['Sui Mainnet'] = getSuiTokenAddress(
        SUI_MAINNET_CHAIN,
        props.env,
      );
      newResults['Sui Testnet'] = getSuiTokenAddress(
        SUI_TESTNET_CHAIN,
        props.env,
      );
    } else if (props.blockchain === 'Solana') {
      newResults['Solana Mainnet'] = getSolanaTokenAddress(
        SOLANA_MAINNET_CHAIN,
        props.env,
      );
      newResults['Solana Testnet'] = getSolanaTokenAddress(
        SOLANA_TESTNET_CHAIN,
        props.env,
      );
      newResults['Solana Devnet'] = getSolanaTokenAddress(
        SOLANA_DEVNET_CHAIN,
        props.env,
      );
    } else if (props.blockchain === 'Starknet') {
      newResults['Starknet Mainnet (Token)'] = getStarknetTokenAddress(
        STARKNET_MAINNET_CHAIN,
        props.env,
        'token',
      );
      newResults['Starknet Mainnet (Asset Router)'] = getStarknetTokenAddress(
        STARKNET_MAINNET_CHAIN,
        props.env,
        'assetRouter',
      );
      newResults['Starknet Sepolia (Token)'] = getStarknetTokenAddress(
        STARKNET_SEPOLIA_CHAIN,
        props.env,
        'token',
      );
      newResults['Starknet Sepolia (Asset Router)'] = getStarknetTokenAddress(
        STARKNET_SEPOLIA_CHAIN,
        props.env,
        'assetRouter',
      );
    }

    setResults(newResults);
  };

  return (
    <div className="container">
      <div className="mb-3">
        <h3>Cross-Chain Token Addresses</h3>
        <p className="text-muted">
          Get LBTC token addresses for non-EVM blockchains (Sui, Solana,
          Starknet).
        </p>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <h5>Query Parameters</h5>
          <ul>
            <li>
              <strong>Blockchain:</strong> {props.blockchain}
            </li>
            <li>
              <strong>Environment:</strong> {props.env || 'prod (default)'}
            </li>
          </ul>
        </div>
      </div>

      <Button onClick={handleFetch} actionName="Fetch Addresses" />

      {Object.keys(results).length > 0 && (
        <div className="mt-3">
          <h5>Results:</h5>
          <div className="card">
            <div className="card-body">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Chain</th>
                    <th>Status</th>
                    <th>Address</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(results).map(([chain, address]) => (
                    <tr key={chain}>
                      <td>
                        <strong>{chain}</strong>
                      </td>
                      <td>
                        {address ? (
                          <span className="badge bg-success">Deployed</span>
                        ) : (
                          <span className="badge bg-secondary">
                            Not Deployed
                          </span>
                        )}
                      </td>
                      <td>
                        {address ? (
                          <code className="text-break">{address}</code>
                        ) : (
                          <span className="text-muted">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <CodeBlock text={results} />
        </div>
      )}
    </div>
  );
}
