import axios from 'axios';

import { getApiConfig } from '../../common/api-config';
import type { IEnvParam } from '../../common/parameters';
import { UnauthorizedWalletJwtError } from '../../utils/err';
import {
  getResponseStatus,
  StakeAndBakePermitError,
  toStakeAndBakePermitError,
} from './errors';
import { STAKE_AND_BAKE_PERMITS_TIMEOUT_MS } from './getStakeAndBakePermits';

const SAVE_PERMIT_URL = 'v2/stake-and-bake/permits';

/** Approve-mode results carry no signature; the route still needs a value. */
const EMPTY_SIGNATURE = '0x00';

export interface ISaveStakeAndBakePermitParams extends IEnvParam {
  /** The permit owner. Must be the address the JWT was issued to. */
  address: string;
  /**
   * The EIP-712 typed data that was signed, as returned by `signStakeAndBake`
   * (a JSON string). An object is serialised, with bigints as decimal strings.
   */
  typedData: string | object;
  /** The permit signature. Empty for approve mode. */
  signature: string;
  /**
   * JWT from the wallet-auth flow (`requestWalletChallenge` →
   * `verifyWalletSignature`). Sent as `Authorization: Bearer …`.
   */
  walletJwt: string;
}

function serialiseTypedData(typedData: string | object): string {
  if (typeof typedData === 'string') return typedData;
  return JSON.stringify(typedData, (_, v) =>
    typeof v === 'bigint' ? v.toString() : v,
  );
}

function readOwner(typedData: string): string | undefined {
  try {
    const parsed = JSON.parse(typedData) as {
      message?: { owner?: unknown };
    };
    const owner = parsed?.message?.owner;
    return typeof owner === 'string' ? owner : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Stores a stake-and-bake permit.
 *
 * A permit is identified by owner, staked token, chain and nonce. Saving the
 * same identity again replaces the stored permit, expired or not, which is how
 * a pending permit is edited: re-sign its nonce with a new value or deadline
 * (the spender may change among contracts that stake the same token).
 *
 * POST /v2/stake-and-bake/permits/{address}
 *
 * @param {ISaveStakeAndBakePermitParams} parameters - The parameters.
 * @param {string} parameters.address - The permit owner.
 * @param {string | object} parameters.typedData - The signed EIP-712 typed data.
 * @param {string} parameters.signature - The signature.
 * @param {string} parameters.walletJwt - The JWT from the wallet-auth flow.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @throws {StakeAndBakePermitError} `FORBIDDEN` before any request when the
 * typed data's owner is not `address`; any API refusal otherwise.
 * @throws {UnauthorizedWalletJwtError} when the gateway refuses the JWT (401)
 * or the JWT does not authorise the address (403).
 */
export async function saveStakeAndBakePermit({
  address,
  typedData,
  signature,
  walletJwt,
  env,
}: ISaveStakeAndBakePermitParams): Promise<void> {
  const typedDataJson = serialiseTypedData(typedData);

  // The owner mismatch is checked here so that a 403 from the route can only
  // mean the JWT does not cover the address.
  const owner = readOwner(typedDataJson);
  if (owner && owner.toLowerCase() !== address.toLowerCase()) {
    throw new StakeAndBakePermitError(
      'FORBIDDEN',
      `Permit owner ${owner} does not match address ${address}`,
    );
  }

  const { baseApiV2Url } = getApiConfig(env);

  try {
    await axios.post(
      `${SAVE_PERMIT_URL}/${encodeURIComponent(address)}`,
      {
        typed_data: typedDataJson,
        signature: signature || EMPTY_SIGNATURE,
      },
      {
        baseURL: baseApiV2Url,
        headers: {
          Authorization: `Bearer ${walletJwt}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: STAKE_AND_BAKE_PERMITS_TIMEOUT_MS,
      },
    );
  } catch (error) {
    const status = getResponseStatus(error);
    if (status === 401 || status === 403) {
      throw new UnauthorizedWalletJwtError(SAVE_PERMIT_URL);
    }
    throw toStakeAndBakePermitError(error);
  }
}
