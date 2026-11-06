import { getApiConfig } from '../../common/api-config';
import { ChainId } from '../../common/chains';
import { IEnvParam } from '../../common/parameters';
import { walletAuthChainName } from '../../common/wallet-auth-chain';
import { isLombardError } from '../../shared/errors';
import { getErrorMessage } from '../../utils/err';
import { httpGet, httpRequest } from '../../utils/http';
import { v2RouteAuth } from '../../utils/walletToken';

export interface IGetUserStakeAndBakeSignatureParams extends IEnvParam {
  /**
   * User's destination address
   */
  userDestinationAddress: string;
  /**
   * Chain ID
   */
  chainId: ChainId;
  /**
   * The token the permit is signed against, its `domain.verifyingContract`.
   * On the v2 route, which lists the permits for every token on the chain,
   * only that token's are considered; matched regardless of case. Without
   * one, all are. The v1 route takes no token and ignores it.
   */
  tokenAddress?: string;
  /**
   * The contract the permit lets spend, its `message.spender`. On the v2
   * route only that spender's permits are considered, matched regardless of
   * case; without one, all are. Two products can hold permits for the same
   * token on the same chain, and only the spender tells them apart. The v1
   * route takes no spender and ignores it.
   */
  spenderAddress?: string;
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
  /**
   * The token the reported permit is signed against, as the v2 route names
   * it. The v1 route does not name one, so a v1 record cannot be tied to a
   * token: it is whichever permit was stored last for the wallet and chain.
   */
  tokenAddress?: string;
  /**
   * The spender the reported permit is for, as the v2 route names it. Absent
   * on a v1 record, which therefore cannot be tied to a product either.
   */
  spenderAddress?: string;
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

/** A permit's nonce, or -1 for one the list did not give as an integer. */
function nonceOf({ nonce }: UnusedPermitResponse): bigint {
  return nonce && /^\d+$/.test(nonce) ? BigInt(nonce) : -1n;
}

/**
 * The permit to report: of those for `tokenAddress` and `spenderAddress`, or
 * all of them where either is not given, that can still be claimed, meaning
 * neither expired nor blocked behind an expired lower nonce, the one with the
 * highest nonce.
 *
 * Nonces count up per token as permits are signed, so within one token the
 * highest is the newest, the one v1 reports. They are not comparable across
 * tokens, which is why a caller that knows its token names it: the lowest
 * nonce on the chain can belong to another token entirely. The spender is
 * what tells two permits for the same token apart, so a caller resuming its
 * own permit names that too: without it, a newer permit for another spender
 * is reported in place of its own.
 */
function selectPermit(
  permits: UnusedPermitResponse[],
  tokenAddress: string | undefined,
  spenderAddress: string | undefined,
): UnusedPermitResponse | undefined {
  const wantedToken = tokenAddress?.toLowerCase();
  const wantedSpender = spenderAddress?.toLowerCase();
  let newest: UnusedPermitResponse | undefined;

  for (const permit of permits) {
    if (permit.expired || permit.blocked) continue;
    if (wantedToken && permit.token_address?.toLowerCase() !== wantedToken) {
      continue;
    }
    if (
      wantedSpender &&
      permit.spender_address?.toLowerCase() !== wantedSpender
    ) {
      continue;
    }
    if (!newest || nonceOf(permit) > nonceOf(newest)) newest = permit;
  }

  return newest;
}

/**
 * Get user's stake and bake signature from the API
 *
 * With a wallet token for the address, reads
 * `GET /v2/stake-and-bake/permits/unused/{address}`, which lists every unused
 * permit on the chain, for every token, expired ones included. Of those for
 * `tokenAddress`, or all without one, this reports the newest that can still
 * be claimed: see {@link selectPermit}. With no token, or a token for another
 * wallet, reads the v1 route
 * `GET /api/v1/claimer/get-user-stake-and-bake-signature`, which needs none
 * and reports the most recently stored live permit. The route is chosen
 * before sending: a v2 request that fails, including on a refused token,
 * surfaces as an error rather than falling back.
 *
 * @param {IGetUserStakeAndBakeSignatureParams} parameters - Parameters for getting the signature
 * @param {string} parameters.userDestinationAddress - The destination account address.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {string} parameters.tokenAddress - The optional token the permit is signed against; v2 only.
 * @param {string} parameters.spenderAddress - The optional spender the permit is for; v2 only.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @returns {Promise<IGetUserStakeAndBakeSignatureResponse>} Promise that resolves to the signature response
 */
export async function getUserStakeAndBakeSignature(
  params: IGetUserStakeAndBakeSignatureParams,
): Promise<IGetUserStakeAndBakeSignatureResponse> {
  const { userDestinationAddress, chainId, env, auth, getAuthToken } = params;
  const url = `${getApiConfig(env).baseApiV2Url}/v2/stake-and-bake/permits/unused/${userDestinationAddress}`;

  const v2Auth = await v2RouteAuth(
    { auth, getAuthToken },
    url,
    userDestinationAddress,
  );
  if (!v2Auth) return getUserStakeAndBakeSignatureV1(params);

  try {
    const { data } = await httpRequest<IListUnusedPermitsResponse>({
      url,
      params: { chain: walletAuthChainName(chainId) },
      scope: 'userScoped',
      ...v2Auth,
    });

    const live = selectPermit(
      data?.permits ?? [],
      params.tokenAddress,
      params.spenderAddress,
    );

    return {
      userDestinationAddress,
      signature: '',
      expirationDate: live?.expiration_date ?? '',
      depositAmount: live?.deposit_amount ?? '',
      chainId: String(chainId),
      nonce: live?.nonce,
      tokenAddress: live?.token_address,
      spenderAddress: live?.spender_address,
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

/** The v1 read, for a caller with no wallet token for the address. */
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
