import type { Meta } from '@storybook/react';

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
import { signLbtcDestinationAddr } from './signLbtcDestinationAddr';

const meta = {
  title: 'write/signLbtcDestionationAddr',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [wagmiDecorator, functionType('write')] } satisfies Meta<typeof StoryView>;

export default meta;

export function StoryView() {
  const connection = useConnection();

  const request = async () => {
    if (!canPerformAction(connection)) {
      return;
    }

    return signLbtcDestinationAddr({
      account: connection.account.address,
      chainId: connection.account.chainId,
      provider: connection.provider });
  };

  const { data, error, isLoading, refetch } = useQuery(request, [], false);

  return (
    <>
      <p>
        This method is used to get the signature of the Liquid BTC destination
        address. The signature is used for generating the deposit address.
      </p>

      <div className="mb-4">
        <ConnectButton />
      </div>

      <Button
        onClick={refetch}
        disabled={isLoading || !connection.account.address}
        isLoading={isLoading}
        actionName={signLbtcDestinationAddr.name}
      />

      <CodeBlock text={error || data} />
    </>
  );
}
