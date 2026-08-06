import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import { bcs } from '@mysten/sui/bcs';
import type { SuiGrpcClient } from '@mysten/sui/grpc';

import { getConfig } from '../../const';
import { readSuiDynamicFieldValue } from '../../utils/readSuiDynamicFieldValue';

/**
 * The dynamic-field key under which `lbtc::treasury` stores the bascule check
 * flag. The key is a Move `vector<u8>` holding the ASCII bytes of this string.
 */
const BASCULE_CHECK_FIELD = 'bascule_check';

export interface IIsBasculeCheckEnabledParameters {
  /** Sui gRPC client. */
  client: SuiGrpcClient;
  /** The optional environment identifier (defaults to the SDK default). */
  env?: Env;
}

/**
 * Reports whether the treasury enforces the Bascule when minting.
 *
 * `treasury::mint_v2` reaches `bascule::validate_withdrawal` only when this flag
 * is set, so with the flag off a deposit mints without ever being reported to
 * the Bascule and its deposit status must not gate the claim. The flag is read
 * per call so a toggle is picked up without the consumer re-initialising.
 *
 * @throws if the treasury has no such field. On-chain
 * `is_bascule_check_enabled` aborts in that case, so no mint can succeed and
 * there is nothing to decide here.
 */
export async function isBasculeCheckEnabled({
  client,
  env = DEFAULT_ENV,
}: IIsBasculeCheckEnabledParameters): Promise<boolean> {
  const { treasuryAddress } = getConfig(env);

  const value = await readSuiDynamicFieldValue({
    client,
    parentId: treasuryAddress,
    nameType: 'vector<u8>',
    nameBcs: bcs
      .vector(bcs.u8())
      .serialize(Array.from(new TextEncoder().encode(BASCULE_CHECK_FIELD)))
      .toBytes(),
  });

  if (value === undefined) {
    throw new Error(
      `Treasury ${treasuryAddress} has no ${BASCULE_CHECK_FIELD} flag`,
    );
  }

  if (typeof value !== 'boolean') {
    throw new Error(
      `Treasury ${treasuryAddress} has an invalid ${BASCULE_CHECK_FIELD} flag`,
    );
  }

  return value;
}
