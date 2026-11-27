import { Env } from '@lombard.finance/sdk-common';
import type { Meta, StoryObj } from '@storybook/react';

import { envToNetwork, getConfig } from '../../const/getConfig';
import { Button, CodeBlock, ErrorDisplay } from '../../stories/components';
import { functionType } from '../../stories/decorators/function-type';
import useQuery from '../../stories/hooks/useQuery';
import {
  getMinRedeemAmountSolana,
  getMinRedeemAmountWithFeeSolana,
  getMintingFeeSolana,
  getRedeemFeeSolana,
  getTokenFeeConfig,
} from './getTokenFeeConfig';

type TokenChoice = 'LBTC' | 'BTC.b';

interface StoryArgs {
  environment: Env;
  token: TokenChoice;
}

function resolveTokenMint(token: TokenChoice, env: Env): string | undefined {
  const config = getConfig(env);
  return token === 'LBTC'
    ? config.lbtcTokenMint
    : (config.btcbTokenMint ?? undefined);
}

export function StoryView({ environment, token }: StoryArgs) {
  const network = envToNetwork[environment];
  const tokenMint = resolveTokenMint(token, environment);

  const params = { network, env: environment, tokenMint };

  const configQuery = useQuery(
    () => getTokenFeeConfig(params),
    [environment, token],
    false,
  );
  const redeemFeeQuery = useQuery(
    () => getRedeemFeeSolana(params),
    [environment, token],
    false,
  );
  const mintingFeeQuery = useQuery(
    () => getMintingFeeSolana(params),
    [environment, token],
    false,
  );
  const minRedeemQuery = useQuery(
    () => getMinRedeemAmountSolana(params),
    [environment, token],
    false,
  );
  const minRedeemWithFeeQuery = useQuery(
    () => getMinRedeemAmountWithFeeSolana(params),
    [environment, token],
    false,
  );

  const isLoading =
    configQuery.isLoading ||
    redeemFeeQuery.isLoading ||
    mintingFeeQuery.isLoading ||
    minRedeemQuery.isLoading ||
    minRedeemWithFeeQuery.isLoading;

  const fetchAll = () => {
    configQuery.refetch();
    redeemFeeQuery.refetch();
    mintingFeeQuery.refetch();
    minRedeemQuery.refetch();
    minRedeemWithFeeQuery.refetch();
  };

  const error =
    configQuery.error ||
    redeemFeeQuery.error ||
    mintingFeeQuery.error ||
    minRedeemQuery.error ||
    minRedeemWithFeeQuery.error;

  const summary = configQuery.data
    ? {
        redeemFee: configQuery.data.redeemFee.toFormat(),
        redeemForBtcMinAmount:
          configQuery.data.redeemForBtcMinAmount.toFormat(),
        maxMintCommission: configQuery.data.maxMintCommission.toFormat(),
        toNativeCommission: configQuery.data.toNativeCommission.toFormat(),
        'getRedeemFeeSolana (toNative + redeem)':
          redeemFeeQuery.data?.toFormat(),
        getMintingFeeSolana: mintingFeeQuery.data?.toFormat(),
        getMinRedeemAmountSolana: minRedeemQuery.data?.toFormat(),
        getMinRedeemAmountWithFeeSolana: minRedeemWithFeeQuery.data?.toFormat(),
      }
    : undefined;

  return (
    <div>
      <p>
        <strong>Network:</strong> {network} | <strong>Token:</strong> {token}
        {tokenMint ? ` (${tokenMint})` : ' — not configured'}
      </p>

      <Button
        primary
        size="large"
        onClick={fetchAll}
        isLoading={isLoading}
        actionName={getTokenFeeConfig.name}
      />

      {summary && <CodeBlock text={summary} />}
      {error && <ErrorDisplay error={error} title="Error" />}
    </div>
  );
}

const meta: Meta<typeof StoryView> = {
  title: 'read/getTokenFeeConfig (Asset Router)',
  component: StoryView,
  tags: ['autodocs'],
  decorators: [functionType('read')],
  parameters: {
    docs: {
      description: {
        component: `Reads the Asset Router \`TokenConfig\` account for a given token mint on Solana.

Returns protocol fee parameters: **redeem fee**, **min redeem amount**, **max mint commission**, and **native commission**.

Also demonstrates the convenience wrappers: \`getRedeemFeeSolana\`, \`getMintingFeeSolana\`, \`getMinRedeemAmountSolana\`, \`getMinRedeemAmountWithFeeSolana\`.`,
      },
    },
  },
  args: {
    environment: Env.stage,
    token: 'LBTC',
  },
  argTypes: {
    environment: {
      control: { type: 'select' },
      options: Object.values(Env),
    },
    token: {
      control: { type: 'select' },
      options: ['LBTC', 'BTC.b'] satisfies TokenChoice[],
    },
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Stage: Story = {
  args: { environment: Env.stage, token: 'LBTC' },
};
