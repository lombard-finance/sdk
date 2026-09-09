import axios from 'axios';

import { getApiConfig } from '../../common/api-config';
import { IEnvParam } from '../../common/parameters';
import { getErrorMessage } from '../../utils/err';

export type IStoreStakeAndBakeSignatureStatus = 'success';

interface IStoreStakeAndBakeSignatureResponse {
  status: IStoreStakeAndBakeSignatureStatus;
}

const EMPTY_SIGNATURE = '0x00';

/**
 * Message fragments the API uses to say a live signature is already on file.
 *
 * Matched on the message rather than a numeric code because the code this
 * route answers with is not established here — the neighbouring routes use 6
 * (`save-user-signature`) and 9 (`auth/wallet/verify`) for the same condition,
 * and assuming either for this one would misclassify whatever it does use.
 * Whatever code did arrive is carried on the error instead.
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
 * One live signature is kept per user and chain while it is unexpired and
 * unused, so signing again does not replace it — and it cannot get around it
 * by carrying a different nonce either, since the nonce comes from
 * `nonces(owner)` on the token and ERC-2612 advances it only when a permit is
 * actually spent. A permit signed while the stored one is unused therefore
 * carries the same value.
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
   * JSON typed data used for the signature
   */
  typedData: string;
}

/**
 * Store stake and bake signature
 *
 * @param {IStoreStakeAndBakeSignatureParams} parameters - The parameters for storing stake and bake signature
 * @param {string} parameters.signature - The signature.
 * @param {string} parameters.typedData - The serialized typed data.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @returns {Promise<IStoreStakeAndBakeSignatureStatus>}
 */
export async function storeStakeAndBakeSignature({
  signature,
  typedData,
  env,
}: IStoreStakeAndBakeSignatureParams): Promise<IStoreStakeAndBakeSignatureStatus> {
  const { baseApiUrl } = getApiConfig(env);

  try {
    const { data } = await axios.post<IStoreStakeAndBakeSignatureResponse>(
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
    const errorMsg = getErrorMessage(error);

    if (isActiveSignatureError(errorMsg)) {
      const code = axios.isAxiosError(error)
        ? (error.response?.data as { code?: number } | undefined)?.code
        : undefined;
      throw new StakeAndBakeSignatureExistsError(errorMsg, code);
    }

    throw new Error(errorMsg);
  }
}
