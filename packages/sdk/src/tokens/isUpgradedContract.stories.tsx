import { Env } from '@lombard.finance/sdk-common';
import type { Meta, StoryObj } from '@storybook/react';
import { ChainId } from '../common/chains';
import { chainSelector, envSelector } from '../stories/arg-types';
import { Button } from '../stories/components/Button';
import { CodeBlock } from '../stories/components/CodeBlock';
import { functionType } from '../stories/components/decorators';
import useQuery from '../stories/hooks/useQuery';
import { Token } from './token-addresses';
import { isUpgradedContract } from './tokens';

const meta = {
  title: 'tokens/isUpgradedContract',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('read')],
  argTypes: {
    ...chainSelector,
    ...envSelector,
    token: {
      options: [Token.LBTC, Token.BTCK],
      control: { type: 'select' },
    },
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

export const BTCKOnKatanaTatara: Story = {
  args: {
    token: Token.BTCK,
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

interface StoryViewProps {
  token: Token.LBTC | Token.BTCK;
  chainId: ChainId;
  env?: Env;
}

/**
 * Check if a token contract has been upgraded to the new version.
 *
 * Lombard token contracts can be upgraded to new versions with additional
 * functionality. This function checks if a contract has the `getAssetRouter`
 * function, which indicates it's using the upgraded version.
 *
 * **Supported Tokens:**
 * - `LBTC`: Checks for STLBTC_ABI (upgraded) vs LBTC_ABI (legacy)
 * - `BTCK`: Checks for NATIVE_LBTC_ABI (upgraded) vs BTCK_ABI (legacy)
 *
 * **Use Cases:**
 * - Determine which ABI to use for contract interactions
 * - Feature detection for upgraded contract functions
 * - Display upgrade status in UI
 *
 * **Returns:**
 * - `true`: Contract is upgraded (has getAssetRouter)
 * - `false`: Contract is legacy or doesn't support upgrades
 */
export function StoryView(props: StoryViewProps) {
  const request = async () => {
    return isUpgradedContract(props.token, props.chainId, props.env);
  };

  const { data, error, isLoading, refetch } = useQuery(
    request,
    [props.token, props.chainId, props.env],
    false,
  );

  return (
    <div className="container">
      <div className="mb-3">
        <h3>Contract Upgrade Status</h3>
        <p className="text-muted">
          Checks if the token contract has been upgraded to the latest version
          with enhanced functionality.
        </p>
      </div>

      <Button
        onClick={refetch}
        disabled={isLoading}
        isLoading={isLoading}
        actionName={isUpgradedContract.name}
      />

      {typeof data === 'boolean' && (
        <div className="mt-3">
          <div className={`alert ${data ? 'alert-success' : 'alert-info'}`}>
            <strong>Status:</strong>{' '}
            {data
              ? '✅ Contract is upgraded (uses enhanced ABI)'
              : 'ℹ️ Contract uses legacy ABI'}
          </div>
        </div>
      )}

      <CodeBlock text={error ?? (data !== undefined ? data : null)} />
    </div>
  );
}
