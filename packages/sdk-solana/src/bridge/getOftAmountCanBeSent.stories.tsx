import { Env } from '@lombard.finance/sdk-common';
import type { Meta, StoryObj } from '@storybook/react';
import { getOftAmountCanBeSent } from './getOftAmountCanBeSent';
import useQuery from '../stories/hooks/useQuery';
import { functionType } from '../stories/decorators/function-type';
import { Button, ErrorDisplay, ResultDisplay } from '../stories/components';

interface GetOftAmountStoryArgs {
  env: Env;
  destinationEid: number;
}

export const StoryView = ({ env, destinationEid }: GetOftAmountStoryArgs) => {
  const request = async () => {
    if (!destinationEid) throw new Error('Destination EID is required.');
    try {
      const amount = await getOftAmountCanBeSent({
        env,
        destinationLzEndpointId: destinationEid,
      });
      return amount.toString();
    } catch (err) {
      console.error('Fetch Amount Error:', err);
      throw err;
    }
  };

  const {
    data: result,
    error,
    isLoading,
    refetch: handleFetch,
  } = useQuery(request, [env, destinationEid], false);

  return (
    <>
      <div className="d-grid gap-2 my-4">
        <Button
          primary
          onClick={handleFetch}
          isLoading={isLoading}
          disabled={isLoading || !destinationEid}
          actionName={getOftAmountCanBeSent.name}
        />
      </div>

      {result !== null && result !== undefined && (
        <ResultDisplay
          result={result}
          title="Amount Can Be Sent (base units)"
        />
      )}
      {error && <ErrorDisplay error={error} title="Error" />}
    </>
  );
};

const meta: Meta<typeof StoryView> = {
  title: 'read/getOftAmountCanBeSent',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('read')],
  parameters: {
    docs: {
      description: {
        component:
          'Fetches the rate-limited amount of OFT (like LBTC) that can be sent from Solana using `getOftAmountCanBeSent`.',
      },
    },
  },
  argTypes: {
    env: {
      control: 'select',
      options: Object.values(Env),
    },
    destinationEid: {
      control: 'number',
      name: 'Destination EID',
    },
  },
  args: {
    env: Env.prod,
    destinationEid: 30101,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;
