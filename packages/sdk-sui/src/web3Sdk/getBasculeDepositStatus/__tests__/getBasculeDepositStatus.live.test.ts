/**
 * Live probe of the deposit-table field-id derivation.
 *
 * Talks to public gRPC nodes, so it is excluded from the unit run and lives
 * behind `yarn workspace @lombard.finance/sdk-sui test:live`.
 *
 * The deposit lookup derives the dynamic-field object id locally
 * (`deriveDynamicFieldID` over a `u256` key), and the unit tests can only
 * check that derivation against itself. This asserts it against the chain:
 * for a real entry of the prod Bascule deposit-history table, the locally
 * derived id must equal the id the node lists. A regression here would map
 * every deposit to UNREPORTED and block claims wherever the bascule check is
 * enforced.
 */
import { Env } from '@lombard.finance/sdk-common';
import { bcs } from '@mysten/sui/bcs';
import { deriveDynamicFieldID } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';

import { getConfig } from '../../../const';
import { createSuiGrpcClient } from '../../../utils/createSuiGrpcClient';
import { unwrapSuiJsonValue } from '../../../utils/unwrapSuiJsonValue';

describe('Bascule deposit-table field id derivation', () => {
  it('matches the chain for a real deposit entry', async () => {
    const client = createSuiGrpcClient('mainnet');
    const { bascule } = getConfig(Env.prod);

    // The deposit-history table id, read the same way getBasculeState reads it.
    const { response } = await client.ledgerService.getObject({
      objectId: bascule,
      readMask: { paths: ['json'] },
    });
    const fields = unwrapSuiJsonValue(response.object?.json) as {
      mDepositHistory?: { id?: string };
    } | null;
    const tableId = fields?.mDepositHistory?.id;
    expect(tableId).toBeTruthy();

    // Any real entry will do; its listed id is the chain's own derivation.
    // The raw service is used because the core wrapper sends no read mask and
    // the node then omits the name bytes.
    const { response: page } = await client.stateService.listDynamicFields({
      parent: tableId as string,
      pageSize: 3,
      readMask: { paths: ['field_id', 'name'] },
    });
    expect(page.dynamicFields.length).toBeGreaterThan(0);

    for (const entry of page.dynamicFields) {
      // The name arrives as BCS; round-trip it through the same u256
      // serialization getDepositStatus performs on a decimal deposit id.
      const depositId = bcs
        .u256()
        .parse(entry.name?.value as Uint8Array)
        .toString();

      const derived = deriveDynamicFieldID(
        tableId as string,
        'u256',
        bcs.u256().serialize(depositId).toBytes(),
      );

      expect(derived).toBe(entry.fieldId);
    }
  }, 60_000);
});
