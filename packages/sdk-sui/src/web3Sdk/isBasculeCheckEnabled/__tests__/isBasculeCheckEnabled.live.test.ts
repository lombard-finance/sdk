/**
 * Live probe of the treasury `bascule_check` flag.
 *
 * Talks to public gRPC nodes, so it is excluded from the unit run and lives
 * behind `yarn workspace @lombard.finance/sdk-sui test:live`.
 *
 * It guards the assumption `isBasculeCheckEnabled` throws on: every deployed
 * treasury carries the flag as a `vector<u8>` -> `bool` dynamic field. If a
 * redeploy ever drops it, claims would fail on-chain anyway, and this says so
 * before a user hits it.
 */
import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import {
  createSuiGrpcClient,
  type SuiNetwork,
} from '../../../utils/createSuiGrpcClient';
import { isBasculeCheckEnabled } from '../isBasculeCheckEnabled';

// Stage runs on testnet, same as the testnet env, with its own treasury object.
const ENVS: [Env, SuiNetwork][] = [
  [Env.prod, 'mainnet'],
  [Env.testnet, 'testnet'],
  [Env.stage, 'testnet'],
];

describe.each(ENVS)('isBasculeCheckEnabled (%s)', (env, network) => {
  it('reads a boolean flag off the deployed treasury', async () => {
    const client = createSuiGrpcClient(network);

    await expect(isBasculeCheckEnabled({ client, env })).resolves.toEqual(
      expect.any(Boolean),
    );
  }, 60_000);
});
