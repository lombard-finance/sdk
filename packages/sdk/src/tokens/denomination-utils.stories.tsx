import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Button } from '../stories/components/Button';
import { CodeBlock } from '../stories/components/CodeBlock';
import { functionType } from '../stories/components/decorators';
import { fromBaseDenomination, toBaseDenomination } from './tokens';

const meta = {
  title: 'tokens/denomination-conversion',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('read')],
  argTypes: {
    amount: {
      control: { type: 'text' },
      description: 'Amount to convert',
    },
    decimals: {
      control: { type: 'number', min: 0, max: 18 },
      description: 'Number of decimal places',
    },
  },
} satisfies Meta<typeof StoryView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const BTCToSatoshi: Story = {
  args: {
    amount: '1',
    decimals: 8,
  },
};

export const LBTCToWei: Story = {
  args: {
    amount: '0.5',
    decimals: 8,
  },
};

export const SmallAmount: Story = {
  args: {
    amount: '0.00000001',
    decimals: 8,
  },
};

interface StoryViewProps {
  amount: string;
  decimals: number;
}

/**
 * Convert between human-readable amounts and base denominations.
 *
 * These utility functions handle conversion between display values and
 * contract-compatible base units (like satoshis for BTC or wei for ETH).
 *
 * **Functions:**
 *
 * 1. `toBaseDenomination(amount, decimals)`:
 *    - Converts human-readable amount to base units
 *    - Example: 1 BTC → 100,000,000 satoshis (decimals=8)
 *    - Use before sending amounts to smart contracts
 *
 * 2. `fromBaseDenomination(amount, decimals)`:
 *    - Converts base units to human-readable amount
 *    - Example: 100,000,000 satoshis → 1 BTC (decimals=8)
 *    - Use when displaying contract values to users
 *
 * **Common Decimal Places:**
 * - BTC/LBTC: 8 decimals
 * - ETH: 18 decimals
 * - USDC/USDT: 6 decimals
 *
 * **Important Notes:**
 * - Uses BigNumber.js for precision
 * - Rounds to nearest integer for base denomination
 * - No rounding for display denomination
 */
export function StoryView(props: StoryViewProps) {
  const [results, setResults] = useState<{
    toBase: string;
    fromBase: string;
  } | null>(null);

  const handleConvert = () => {
    try {
      const toBase = toBaseDenomination(props.amount, props.decimals);
      const fromBase = fromBaseDenomination(toBase, props.decimals);

      setResults({
        toBase: toBase.toString(),
        fromBase: fromBase.toString(),
      });
    } catch (err) {
      setResults({
        toBase: `Error: ${err}`,
        fromBase: 'N/A',
      });
    }
  };

  return (
    <div className="container">
      <div className="mb-3">
        <h3>Denomination Conversion Utilities</h3>
        <p className="text-muted">
          Convert between human-readable amounts and base denominations (wei,
          satoshis, etc.)
        </p>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <h5>Input Values</h5>
          <ul>
            <li>
              <strong>Amount:</strong> {props.amount}
            </li>
            <li>
              <strong>Decimals:</strong> {props.decimals}
            </li>
          </ul>
        </div>
      </div>

      <Button onClick={handleConvert} actionName="Convert" />

      {results && (
        <div className="mt-3">
          <div className="card mb-3">
            <div className="card-body">
              <h5>Conversion Results</h5>

              <div className="mb-3">
                <h6>toBaseDenomination():</h6>
                <p className="text-muted mb-2">
                  Converts to base units (for smart contract calls)
                </p>
                <code className="d-block p-2 bg-light">
                  {props.amount} × 10^{props.decimals} = {results.toBase}
                </code>
              </div>

              <div>
                <h6>fromBaseDenomination():</h6>
                <p className="text-muted mb-2">
                  Converts back to human-readable (for display)
                </p>
                <code className="d-block p-2 bg-light">
                  {results.toBase} ÷ 10^{props.decimals} = {results.fromBase}
                </code>
              </div>
            </div>
          </div>

          <h5 className="mt-4">Example Usage:</h5>
          <CodeBlock
            text={{
              example: {
                input: `toBaseDenomination("${props.amount}", ${props.decimals})`,
                output: results.toBase,
                reverseInput: `fromBaseDenomination("${results.toBase}", ${props.decimals})`,
                reverseOutput: results.fromBase,
              },
            }}
          />
        </div>
      )}
    </div>
  );
}
