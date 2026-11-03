import { isAxiosError } from 'axios';

import { getApiConfig } from '../../common/api-config';
import { IEnvParam } from '../../common/parameters';
import { walletAuthChainName } from '../../common/wallet-auth-chain';
import { isLombardError } from '../../shared/errors';
import { getErrorMessage } from '../../utils/err';
import { httpPost, httpRequest, resolveAuthToken } from '../../utils/http';

export type IStoreNetworkFeeSignatureStatus = 'success';

interface IStoreNetworkFeeSignatureResponse {
  status: IStoreNetworkFeeSignatureStatus;
}

/**
 * Thrown when the Lombard API refuses to store a new fee signature because
 * an active one already exists for the user. The caller should re-fetch the
 * existing signature (see `getNetworkFeeSignature`) and proceed with it
 * instead of treating this as a fatal authorization failure.
 *
 * The Lombard API returns this as `{ code: 6, message: "Active signature
 * already exists for this user" }`: 6 is the gRPC `AlreadyExists` status, which
 * both routes answer with while an approval is in force for the same address,
 * chain and token.
 */
export class FeeSignatureAlreadyExistsError extends Error {
  readonly code = 6;
  constructor(message = 'Active signature already exists for this user') {
    super(message);
    this.name = 'FeeSignatureAlreadyExistsError';
  }
}

export interface IStoreNetworkFeeSignatureParams extends IEnvParam {
  /**
   * signature
   */
  signature: string;
  /**
   * JSON typed data used for the signature, exactly as signed. On the v2
   * route, the chain the approval is stored under is read from its
   * `message.chainId`.
   */
  typedData: string;
  /**
   * Destination address
   */
  address: string;
  /**
   * Token address (required to distinguish LBTC vs BTC.b signatures). Sent to
   * the v1 route only; the v2 route reads the token from the typed data's
   * `domain.verifyingContract`, the one the approval was signed against.
   */
  tokenAddress?: string;
}

/**
 * The `/v2/chains` name of the chain the approval was signed for.
 *
 * Read from the typed data rather than taken as a parameter because the route
 * refuses a chain that differs from `message.chainId`, so the signed document
 * is the only value that can be right.
 */
function chainOfApproval(typedData: string): string {
  let chainId: unknown;
  try {
    chainId = (JSON.parse(typedData) as { message?: { chainId?: unknown } })
      ?.message?.chainId;
  } catch {
    // Reported below with the rest of the unusable cases.
  }

  const id = Number(chainId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(
      'The fee approval typed data has no message.chainId, so the chain to store it under is unknown.',
    );
  }
  return walletAuthChainName(id);
}

/** Reports the API's "already in force" refusal as its own type. */
function toStoreError(error: unknown): Error {
  if (
    isAxiosError(error) &&
    (error.response?.data as { code?: number } | undefined)?.code === 6
  ) {
    const message =
      (error.response?.data as { message?: string } | undefined)?.message ??
      'Active signature already exists for this user';
    return new FeeSignatureAlreadyExistsError(message);
  }
  return new Error(getErrorMessage(error));
}

/**
 * Authorize network fee
 *
 * With a wallet token for `address`, posts to
 * `POST /v2/mint-with-fee/fee-approvals/{address}`. Without one, posts to the
 * v1 route `POST /api/v1/claimer/save-user-signature`, which needs no token.
 * Only the absence of a token selects v1: a token the v2 route refuses
 * surfaces as an error rather than falling back.
 *
 * @param {IStoreNetworkFeeSignatureParams} parameters - The parameters for network fee authorization
 * @param {string} parameters.address - The destination account address.
 * @param {string} parameters.signature - The signature.
 * @param {string} parameters.typedData - The serialized typed data.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @returns {Promise<IStoreNetworkFeeSignatureStatus>}
 *
 * @throws {FeeSignatureAlreadyExistsError} when an approval is already in force
 *   for the address, chain and token.
 */
export async function storeNetworkFeeSignature(
  params: IStoreNetworkFeeSignatureParams,
): Promise<IStoreNetworkFeeSignatureStatus> {
  const { signature, typedData, address, env, auth, getAuthToken } = params;
  const url = `${getApiConfig(env).baseApiV2Url}/v2/mint-with-fee/fee-approvals/${address}`;

  const token = await resolveAuthToken(
    { auth, getAuthToken },
    { url, scope: 'userScoped' },
  );
  if (!token) return storeNetworkFeeSignatureV1(params);

  const chain = chainOfApproval(typedData);

  try {
    await httpRequest({
      url,
      method: 'POST',
      body: { chain, data: typedData, signature },
      scope: 'userScoped',
      auth,
      getAuthToken,
    });

    return 'success';
  } catch (error) {
    // A rejected token is the caller's to act on, and the code says so;
    // flattening it into a plain Error would drop that.
    if (isLombardError(error)) throw error;

    throw toStoreError(error);
  }
}

/** The v1 store, for a caller with no wallet token. */
async function storeNetworkFeeSignatureV1({
  signature,
  typedData,
  address,
  env,
  tokenAddress,
  getAuthToken,
}: IStoreNetworkFeeSignatureParams): Promise<IStoreNetworkFeeSignatureStatus> {
  const { baseApiUrl } = getApiConfig(env);

  try {
    const params: Record<string, string> = {
      typed_data: typedData,
      signature,
      user_destination_address: address,
    };

    // Include token address to distinguish LBTC vs BTC.b signatures
    if (tokenAddress) {
      params.token_address = tokenAddress;
    }

    const { data } = await httpPost<IStoreNetworkFeeSignatureResponse>(
      `${baseApiUrl}/api/v1/claimer/save-user-signature`,
      null,
      { params, getAuthToken },
    );

    return data.status;
  } catch (error) {
    throw toStoreError(error);
  }
}
