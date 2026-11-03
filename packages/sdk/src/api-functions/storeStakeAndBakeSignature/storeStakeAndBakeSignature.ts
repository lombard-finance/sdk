import { getApiConfig } from '../../common/api-config';
import { IEnvParam } from '../../common/parameters';
import { isLombardError } from '../../shared/errors';
import { getErrorMessage } from '../../utils/err';
import { httpPost, httpRequest } from '../../utils/http';
import { v2RouteAuth } from '../../utils/walletToken';

export type IStoreStakeAndBakeSignatureStatus = 'success';

interface IStoreStakeAndBakeSignatureResponse {
  status: IStoreStakeAndBakeSignatureStatus;
}

const EMPTY_SIGNATURE = '0x00';

/**
 * Message fragments the API uses to say a live signature is already on file.
 *
 * Matched on the message rather than a numeric code because the code alone
 * does not say which case it is: 6, `AlreadyExists`, is also what the v2 route
 * answers for a permit whose nonce the token has already consumed, which no
 * amount of waiting unblocks. Whatever code did arrive is carried on the error
 * instead.
 */
const ACTIVE_SIGNATURE_PATTERNS = [
  'stake and bake signature already exists',
  'active signature already exists',
  'signature already exists',
  'existing stake found',
  'pending stake already exists',
] as const;

/**
 * Whether an API error message is the refusal to store a second live
 * signature, rather than an unrelated failure.
 */
export function isActiveSignatureError(message: string): boolean {
  const normalized = message.toLowerCase();
  return ACTIVE_SIGNATURE_PATTERNS.some((pattern) =>
    normalized.includes(pattern),
  );
}

/**
 * Thrown when the API refuses to store a stake-and-bake signature because one
 * is already on file for this wallet and chain.
 *
 * On the v1 route, one live signature is kept per user and chain while it is
 * unexpired and unused, so signing again does not replace it — and it cannot
 * get around it by carrying a different nonce either, since the nonce comes
 * from `nonces(owner)` on the token and ERC-2612 advances it only when a
 * permit is actually spent. A permit signed while the stored one is unused
 * therefore carries the same value.
 *
 * The v2 route, used when a wallet token for the owner is available,
 * replaces an unused permit carrying the same nonce instead, so there this is
 * left for the refusals that remain, such as two saves for one nonce racing
 * each other.
 *
 * Typed so a caller can tell this apart from a transport failure and say what
 * is actually wrong, instead of surfacing the server's own string to a user
 * who has just signed in their wallet for nothing. `expiresAt` on the stored
 * record (see `getUserStakeAndBakeSignature`) is when the flow unblocks.
 */
export class StakeAndBakeSignatureExistsError extends Error {
  constructor(
    message = 'A stake and bake signature already exists for this wallet',
    /** The API's own error code, when the response carried one. */
    public readonly code?: number,
  ) {
    super(message);
    this.name = 'StakeAndBakeSignatureExistsError';
  }
}

export interface IStoreStakeAndBakeSignatureParams extends IEnvParam {
  /**
   * signature
   */
  signature: string;
  /**
   * JSON typed data used for the signature, exactly as signed
   */
  typedData: string;
  /**
   * The permit's owner, the address that signed it. Used to choose and
   * address the v2 route only, and read from the typed data's
   * `message.owner` when omitted.
   */
  address?: string;
}

/** The permit's owner from the typed data, when it names one. */
function ownerOfPermit(typedData: string): string | undefined {
  try {
    const owner = (JSON.parse(typedData) as { message?: { owner?: unknown } })
      ?.message?.owner;
    return typeof owner === 'string' && owner ? owner : undefined;
  } catch {
    return undefined;
  }
}

/** Reports the API's "already on file" refusal as its own type. */
function toStoreError(error: unknown): Error {
  const errorMsg = getErrorMessage(error);

  if (isActiveSignatureError(errorMsg)) {
    // The transport's own rejection is rethrown, so the API's code sits on
    // `response.data` when the response carried one.
    const code = (
      error as { response?: { data?: { code?: number } } } | undefined
    )?.response?.data?.code;
    return new StakeAndBakeSignatureExistsError(errorMsg, code);
  }

  return new Error(errorMsg);
}

/**
 * Store stake and bake signature
 *
 * With a wallet token for the permit's owner, posts to
 * `POST /v2/stake-and-bake/permits/{address}`, which replaces an unused permit
 * on file with the same nonce. Otherwise posts to the v1 route
 * `POST /api/v1/claimer/save-stake-and-bake-signature`, which needs no token
 * and refuses while a live permit is on file: with no token, with a token for
 * another wallet, and when the owner is unknown, since the v2 route is
 * addressed by it and v1 reads it from the typed data itself. The route is
 * chosen before sending: a v2 request that fails, including on a refused
 * token, surfaces as an error rather than falling back.
 *
 * @param {IStoreStakeAndBakeSignatureParams} parameters - The parameters for storing stake and bake signature
 * @param {string} parameters.signature - The signature.
 * @param {string} parameters.typedData - The serialized typed data.
 * @param {string} parameters.address - The optional owner address; read from the typed data when omitted.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @returns {Promise<IStoreStakeAndBakeSignatureStatus>}
 */
export async function storeStakeAndBakeSignature(
  params: IStoreStakeAndBakeSignatureParams,
): Promise<IStoreStakeAndBakeSignatureStatus> {
  const { signature, typedData, address, env, auth, getAuthToken } = params;
  const owner = address || ownerOfPermit(typedData);
  if (!owner) return storeStakeAndBakeSignatureV1(params);

  const url = `${getApiConfig(env).baseApiV2Url}/v2/stake-and-bake/permits/${owner}`;

  const v2Auth = await v2RouteAuth({ auth, getAuthToken }, url, owner);
  if (!v2Auth) return storeStakeAndBakeSignatureV1(params);

  try {
    await httpRequest({
      url,
      method: 'POST',
      body: {
        typed_data: typedData,
        // The approve flow sets the allowance on chain and signs nothing, and
        // the route refuses an empty signature.
        signature: signature || EMPTY_SIGNATURE,
      },
      scope: 'userScoped',
      ...v2Auth,
    });

    return 'success';
  } catch (error) {
    // A rejected token is the caller's to act on, and the code says so;
    // flattening it into a plain Error would drop that.
    if (isLombardError(error)) throw error;

    throw toStoreError(error);
  }
}

/** The v1 store, for a caller with no wallet token for the owner. */
async function storeStakeAndBakeSignatureV1({
  signature,
  typedData,
  env,
}: IStoreStakeAndBakeSignatureParams): Promise<IStoreStakeAndBakeSignatureStatus> {
  const { baseApiUrl } = getApiConfig(env);

  try {
    const { data } = await httpPost<IStoreStakeAndBakeSignatureResponse>(
      `${baseApiUrl}/api/v1/claimer/save-stake-and-bake-signature`,
      null,
      {
        params: {
          typed_data: typedData,
          signature: signature || EMPTY_SIGNATURE,
        },
      },
    );

    return data.status;
  } catch (error) {
    throw toStoreError(error);
  }
}
