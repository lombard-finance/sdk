import axios from 'axios';
import BigNumber from 'bignumber.js';

import { getApiConfig } from '../../common/api-config';
import type { ChainId } from '../../common/chains';
import type { IEnvParam } from '../../common/parameters';
import { UnauthorizedWalletJwtError } from '../../utils/err';
import { getStakeAndBakeApiChainName } from './chainName';
import { getResponseStatus, toStakeAndBakePermitError } from './errors';

const PERMITS_URL = 'v2/stake-and-bake/permits/unused';

/** Cap the request so a stalled gateway can't hang the flow. */
export const STAKE_AND_BAKE_PERMITS_TIMEOUT_MS = 30_000;

interface IStakeAndBakePermitResponse {
  spender_address: string;
  token_address: string;
  nonce: string | number;
  deposit_amount: string | number;
  expiration_date: string | number;
  expired: boolean;
  blocked: boolean;
}

interface IStakeAndBakePermitsResponse {
  permits?: IStakeAndBakePermitResponse[] | null;
  max_permits_per_token?: number | string;
}

/** An unused stake-and-bake permit on file for an owner. */
export interface StakeAndBakePermit {
  /** The stake-and-bake contract the permit authorises. */
  spenderAddress: string;
  /** The token the permit is signed over (the staked token). */
  tokenAddress: string;
  /** The permit nonce, as a decimal string. */
  nonce: string;
  /** The permitted amount, in token base units, as a decimal string. */
  depositAmount: string;
  /** The permit deadline, UNIX seconds. */
  expiresAt: number;
  /** Whether the deadline has passed. Expired permits stay listed. */
  expired: boolean;
  /**
   * Whether a lower unused nonce on the same token has expired. Clears once
   * that lower nonce is re-signed.
   */
  blocked: boolean;
}

export interface IGetStakeAndBakePermitsResult {
  /** Unused permits, lowest nonce first, expired ones included. */
  permits: StakeAndBakePermit[];
  /** How many unused permits the API keeps per owner and token. */
  maxPermitsPerToken: number;
}

export interface IGetStakeAndBakePermitsParams extends IEnvParam {
  /** The permit owner. Must be the address the JWT was issued to. */
  address: string;
  /** The EVM chain the permits are for. */
  chainId: ChainId;
  /**
   * JWT from the wallet-auth flow (`requestWalletChallenge` →
   * `verifyWalletSignature`). Sent as `Authorization: Bearer …`.
   */
  walletJwt: string;
}

const toDecimalString = (value: string | number): string =>
  new BigNumber(value).toFixed(0);

function mapPermit(permit: IStakeAndBakePermitResponse): StakeAndBakePermit {
  return {
    spenderAddress: permit.spender_address,
    tokenAddress: permit.token_address,
    nonce: toDecimalString(permit.nonce),
    depositAmount: toDecimalString(permit.deposit_amount),
    expiresAt: Number(permit.expiration_date),
    expired: Boolean(permit.expired),
    blocked: Boolean(permit.blocked),
  };
}

/**
 * Lists the owner's unused stake-and-bake permits on a chain.
 *
 * GET /v2/stake-and-bake/permits/unused/{address}?chain=…
 *
 * @param {IGetStakeAndBakePermitsParams} parameters - The parameters.
 * @param {string} parameters.address - The permit owner.
 * @param {ChainId} parameters.chainId - The EVM chain.
 * @param {string} parameters.walletJwt - The JWT from the wallet-auth flow.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @throws {UnauthorizedWalletJwtError} when the gateway refuses the JWT (401)
 * or the JWT does not authorise the address (403).
 * @throws {StakeAndBakePermitError} for any other refusal.
 *
 * @returns {Promise<IGetStakeAndBakePermitsResult>} The unused permits and the per-token cap.
 */
export async function getStakeAndBakePermits({
  address,
  chainId,
  walletJwt,
  env,
}: IGetStakeAndBakePermitsParams): Promise<IGetStakeAndBakePermitsResult> {
  const { baseApiV2Url } = getApiConfig(env);
  const url = `${PERMITS_URL}/${encodeURIComponent(address)}`;

  let data: IStakeAndBakePermitsResponse;
  try {
    ({ data } = await axios.get<IStakeAndBakePermitsResponse>(url, {
      baseURL: baseApiV2Url,
      params: { chain: getStakeAndBakeApiChainName(chainId) },
      headers: {
        Authorization: `Bearer ${walletJwt}`,
        Accept: 'application/json',
      },
      timeout: STAKE_AND_BAKE_PERMITS_TIMEOUT_MS,
    }));
  } catch (error) {
    const status = getResponseStatus(error);
    if (status === 401 || status === 403) {
      throw new UnauthorizedWalletJwtError(PERMITS_URL);
    }
    throw toStakeAndBakePermitError(error);
  }

  return {
    permits: (data?.permits ?? []).map(mapPermit),
    maxPermitsPerToken: Number(data?.max_permits_per_token ?? 0),
  };
}
