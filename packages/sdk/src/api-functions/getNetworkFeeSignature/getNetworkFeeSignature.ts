import { getApiConfig } from '../../common/api-config';
import { ChainId } from '../../common/chains';
import { IEnvParam } from '../../common/parameters';
import { walletAuthChainName } from '../../common/wallet-auth-chain';
import { isLombardError } from '../../shared/errors';
import { getErrorMessage } from '../../utils/err';
import { httpGet, httpRequest } from '../../utils/http';
import { v2RouteAuth } from '../../utils/walletToken';

export interface IGetNetworkFeeSignatureParams extends IEnvParam {
  /**
   * Chain ID of the network to interact with
   */
  chainId: ChainId;
  /**
   * Destination address
   */
  address: string;
  /**
   * Token address (optional, required for BTC.b). Without one, the LBTC
   * approval is reported.
   */
  tokenAddress?: string;
}

interface IGetNetworkFeeSignatureResponse {
  /**
   * Expiration date of signature
   */
  expiration_date: string;
  /**
   * The flag signature exists
   */
  has_signature: boolean;
  /**
   * The auto mint is delayed
   */
  is_delayed: boolean;
  /**
   * Serialized signature when available
   */
  signature?: string;
  /**
   * Serialized typed data associated with the signature when available
   */
  typed_data?: string;
}

/**
 * A fee approval as `/v2/mint-with-fee/fee-approvals/{address}` writes it.
 * Enums arrive as short lowercase names (`ethereum_sepolia`, `lbtc`); the full
 * schema names are accepted too.
 */
interface FeeApprovalResponse {
  chain?: string;
  address?: string;
  asset?: { asset_type?: string; address?: string };
  /** RFC 3339. */
  expires_at?: string;
  delayed?: boolean;
}

interface IListFeeApprovalsResponse {
  fee_approvals?: FeeApprovalResponse[];
}

export interface IGetNetworkFeeSignatureMappedResponse {
  /**
   * When the approval lapses, in Unix seconds as a decimal string. With no
   * approval in force the v2 route reports it empty and the v1 route leaves it
   * out.
   */
  expirationDate: string;
  /**
   * The flag signature exists
   */
  hasSignature: boolean;
  /**
   * The auto mint is delayed
   */
  isDelayed: boolean;
  /**
   * Serialized signature when available. The v2 route never sends it.
   */
  signature?: string;
  /**
   * Serialized typed data associated with the signature when available. The
   * v2 route never sends it.
   */
  typedData?: string;
}

/** `lbtc` and `ASSET_TYPE_LBTC` both name LBTC. */
function isLbtc(assetType: string | undefined): boolean {
  return assetType?.toLowerCase().replace(/^asset_type_/, '') === 'lbtc';
}

/**
 * The approval for the token asked about. The route lists one per token the
 * chain mints, so a caller naming none gets LBTC's, which is what the v1 route
 * answers with when it is given no token.
 */
function selectApproval(
  approvals: FeeApprovalResponse[],
  tokenAddress: string | undefined,
): FeeApprovalResponse | undefined {
  if (tokenAddress) {
    const wanted = tokenAddress.toLowerCase();
    return approvals.find((a) => a.asset?.address?.toLowerCase() === wanted);
  }
  return approvals.find((a) => isLbtc(a.asset?.asset_type));
}

/** RFC 3339 to Unix seconds, the unit callers compare against. */
function toUnixSecondsString(timestamp: string | undefined): string {
  const ms = timestamp ? Date.parse(timestamp) : NaN;
  return Number.isFinite(ms) ? String(Math.floor(ms / 1000)) : '';
}

/**
 * Returns the expiration date and the flag signature exists
 *
 * With a wallet token for `address`, reads
 * `GET /v2/mint-with-fee/fee-approvals/{address}`. With no token, or a token
 * for another wallet, reads the v1 route
 * `GET /api/v1/claimer/get-user-signature`, which needs none. The route is
 * chosen before sending: a v2 request that fails, including on a refused
 * token, surfaces as an error rather than falling back.
 *
 * @param {IGetNetworkFeeSignatureParams} parameters - The parameters.
 * @param {string} parameters.address - The account address.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {string} parameters.tokenAddress - The optional token address.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @returns {Promise<IGetNetworkFeeSignatureMappedResponse>}
 */
export async function getNetworkFeeSignature(
  params: IGetNetworkFeeSignatureParams,
): Promise<IGetNetworkFeeSignatureMappedResponse> {
  const { address, env, auth, getAuthToken } = params;
  const url = `${getApiConfig(env).baseApiV2Url}/v2/mint-with-fee/fee-approvals/${address}`;

  const v2Auth = await v2RouteAuth({ auth, getAuthToken }, url, address);
  if (!v2Auth) return getNetworkFeeSignatureV1(params);

  try {
    const { data } = await httpRequest<IListFeeApprovalsResponse>({
      url,
      params: { chain: walletAuthChainName(params.chainId) },
      scope: 'userScoped',
      ...v2Auth,
    });

    const approval = selectApproval(
      data?.fee_approvals ?? [],
      params.tokenAddress,
    );

    return {
      expirationDate: toUnixSecondsString(approval?.expires_at),
      hasSignature: Boolean(approval),
      isDelayed: Boolean(approval?.delayed),
    };
  } catch (error) {
    // A rejected token is the caller's to act on, and the code says so;
    // flattening it into a plain Error would drop that.
    if (isLombardError(error)) throw error;

    throw new Error(getErrorMessage(error));
  }
}

/** The v1 read, for a caller with no wallet token for `address`. */
async function getNetworkFeeSignatureV1({
  address,
  chainId,
  env,
  tokenAddress,
  getAuthToken,
}: IGetNetworkFeeSignatureParams): Promise<IGetNetworkFeeSignatureMappedResponse> {
  const { baseApiUrl } = getApiConfig(env);

  try {
    const params: Record<string, string | number> = {
      user_destination_address: address,
      chain_id: chainId,
    };

    if (tokenAddress) {
      params.token_address = tokenAddress;
    }

    const { data } = await httpGet<IGetNetworkFeeSignatureResponse>(
      `${baseApiUrl}/api/v1/claimer/get-user-signature`,
      {
        params,
        getAuthToken,
      },
    );

    return {
      expirationDate: data?.expiration_date,
      hasSignature: data?.has_signature,
      isDelayed: data?.is_delayed,
      signature: data?.signature,
      typedData: data?.typed_data,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    throw new Error(errorMessage);
  }
}
