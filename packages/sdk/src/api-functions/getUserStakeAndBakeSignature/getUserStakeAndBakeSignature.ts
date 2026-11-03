import { getApiConfig } from '../../common/api-config';
import { ChainId } from '../../common/chains';
import { IEnvParam } from '../../common/parameters';
import { walletAuthChainName } from '../../common/wallet-auth-chain';
import { isLombardError } from '../../shared/errors';
import { getErrorMessage } from '../../utils/err';
import { httpGet, httpRequest, resolveAuthToken } from '../../utils/http';

export interface IGetUserStakeAndBakeSignatureParams extends IEnvParam {
  /**
   * User's destination address
   */
  userDestinationAddress: string;
  /**
   * Chain ID
   */
  chainId: ChainId;
}

export interface IGetUserStakeAndBakeSignatureResponse {
  /**
   * The user's destination address
   */
  userDestinationAddress: string;
  /**
   * The signature (may be empty if signature exists but not returned). The
   * v2 route never sends it.
   */
  signature: string;
  /**
   * The expiration date, in Unix seconds. With no live permit on file the v2
   * route reports it empty and the v1 route leaves it out.
   */
  expirationDate: string;
  /**
   * The deposit amount: the permit's value, in the staked token's base units
   */
  depositAmount: string;
  /**
   * The chain ID
   */
  chainId: string;
  /**
   * The nonce (increments with each new signature)
   */
  nonce?: string;
}

interface IGetUserStakeAndBakeSignatureAPIResponse {
  user_destination_address: string;
  signature: string;
  expiration_date: string;
  deposit_amount: string;
  chain_id: string;
  nonce?: string;
}

/**
 * An unused permit as `/v2/stake-and-bake/permits/unused/{address}` writes it.
 * 64-bit integers arrive as decimal strings.
 */
interface UnusedPermitResponse {
  spender_address?: string;
  token_address?: string;
  nonce?: string;
  deposit_amount?: string;
  /** Unix seconds. */
  expiration_date?: string;
  expired?: boolean;
  /** A lower unused nonce on the same token has expired. */
  blocked?: boolean;
}

interface IListUnusedPermitsResponse {
  permits?: UnusedPermitResponse[];
  max_permits_per_token?: string;
}

/**
 * Get user's stake and bake signature from the API
 *
 * With a wallet token for the address, reads
 * `GET /v2/stake-and-bake/permits/unused/{address}`, which lists every unused
 * permit on the chain, lowest nonce first, expired ones included; this reports
 * the first one that can still be claimed, meaning neither expired nor blocked
 * behind an expired lower nonce. Without a token, reads the v1 route
 * `GET /api/v1/claimer/get-user-stake-and-bake-signature`, which needs none.
 * Only the absence of a token selects v1: a token the v2 route refuses
 * surfaces as an error rather than falling back.
 *
 * @param {IGetUserStakeAndBakeSignatureParams} parameters - Parameters for getting the signature
 * @param {string} parameters.userDestinationAddress - The destination account address.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @returns {Promise<IGetUserStakeAndBakeSignatureResponse>} Promise that resolves to the signature response
 */
export async function getUserStakeAndBakeSignature(
  params: IGetUserStakeAndBakeSignatureParams,
): Promise<IGetUserStakeAndBakeSignatureResponse> {
  const { userDestinationAddress, chainId, env, auth, getAuthToken } = params;
  const url = `${getApiConfig(env).baseApiV2Url}/v2/stake-and-bake/permits/unused/${userDestinationAddress}`;

  const token = await resolveAuthToken(
    { auth, getAuthToken },
    { url, scope: 'userScoped' },
  );
  if (!token) return getUserStakeAndBakeSignatureV1(params);

  try {
    const { data } = await httpRequest<IListUnusedPermitsResponse>({
      url,
      params: { chain: walletAuthChainName(chainId) },
      scope: 'userScoped',
      auth,
      getAuthToken,
    });

    const live = (data?.permits ?? []).find(
      (permit) => !permit.expired && !permit.blocked,
    );

    return {
      userDestinationAddress,
      signature: '',
      expirationDate: live?.expiration_date ?? '',
      depositAmount: live?.deposit_amount ?? '',
      chainId: String(chainId),
      nonce: live?.nonce,
    };
  } catch (error) {
    // A rejected token is the caller's to act on, and the code says so;
    // flattening it into a plain Error would drop that.
    if (isLombardError(error)) throw error;

    const errorMessage = getErrorMessage(error);
    throw new Error(
      `Failed to get user stake and bake signature: ${errorMessage}`,
    );
  }
}

/** The v1 read, for a caller with no wallet token. */
async function getUserStakeAndBakeSignatureV1({
  userDestinationAddress,
  chainId,
  env,
  getAuthToken,
}: IGetUserStakeAndBakeSignatureParams): Promise<IGetUserStakeAndBakeSignatureResponse> {
  const { baseApiUrl } = getApiConfig(env);

  try {
    const { data } = await httpGet<IGetUserStakeAndBakeSignatureAPIResponse>(
      `${baseApiUrl}/api/v1/claimer/get-user-stake-and-bake-signature`,
      {
        params: {
          userDestinationAddress,
          chainId: chainId.toString(),
        },
        getAuthToken,
      },
    );

    return {
      userDestinationAddress: data.user_destination_address,
      signature: data.signature,
      expirationDate: data.expiration_date,
      depositAmount: data.deposit_amount,
      chainId: data.chain_id,
      nonce: data.nonce,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    throw new Error(
      `Failed to get user stake and bake signature: ${errorMessage}`,
    );
  }
}
