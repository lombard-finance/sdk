import axios, { type AxiosError } from 'axios';

import { getApiConfig } from '../../common/api-config';
import { getLegacyChainNameById } from '../../common/blockchain-identifier';
import type {
  ChainId,
  SolanaChain,
  StarknetChainId,
  SuiChain,
} from '../../common/chains';
import type { IEnvParam } from '../../common/parameters';
import { Token } from '../../tokens/token-addresses';
import { getErrorMessage, UnauthorizedWalletJwtError } from '../../utils/err';
import {
  isSanctionedAddressError,
  SANCTIONED_ADDRESS,
} from '../generateDepositBtcAddress/generateDepositBtcAddress';

const RESOLVE_ADDRESS_URL = 'v2/addresses/deposit';

/** Cap the request so a stalled gateway can't hang the deposit flow. */
const RESOLVE_ADDRESS_TIMEOUT_MS = 30_000;

/**
 * The asset identifiers this route accepts. Only the pairs verified against a
 * live deployment are listed: a token missing here has no identifier as far as
 * this SDK is concerned, so callers fall back to the signature-carrying
 * `generateDepositBtcAddress` rather than guessing a name.
 */
const ASSET_TYPE_BY_TOKEN: Partial<Record<Token, string>> = {
  [Token.LBTC]: 'ASSET_TYPE_LBTC',
  [Token.BTCb]: 'ASSET_TYPE_BTCB',
};

interface IResolveDepositAddressResponse {
  deposit_address?: {
    btc_address?: string;
    address?: string;
  };
  address?: string;
}

export interface IResolveDepositBtcAddressParams extends IEnvParam {
  /**
   * The destination user address where the token will be claimed. Control of
   * it is proven by the JWT, which is why this route carries no signature.
   */
  address: string;
  /**
   * The destination chain ID where the token will be claimed.
   */
  chainId: ChainId | SuiChain | SolanaChain | StarknetChainId;
  /**
   * The intended destination token, defaults to LBTC.
   */
  token?: Token;
  /**
   * JWT from the wallet-auth flow (`requestWalletChallenge` →
   * `verifyWalletSignature`). Sent as `Authorization: Bearer …`.
   */
  walletJwt: string;
  /**
   * The partner ID.
   */
  partnerId?: string;
  /**
   * The referrer code.
   */
  referrerCode?: string;
  /**
   * Deposit-address nonce, defaults to 0.
   */
  nonce?: number;
  /**
   * Destination asset contract address, for the case where the gateway should
   * not resolve it from `token`. Omitted by default.
   */
  destinationAssetAddress?: string;
}

/**
 * The `ASSET_TYPE_*` identifier for a token on the deposit-address route.
 *
 * @throws if the token has no identifier.
 */
export function getDepositAssetTypeById(token: Token): string {
  const assetType = ASSET_TYPE_BY_TOKEN[token];

  if (!assetType) {
    throw new Error(`No deposit-address asset identifier for token: ${token}`);
  }

  return assetType;
}

/**
 * Whether this chain and token pair can be named on the JWT route at all.
 * `false` means the caller has to use `generateDepositBtcAddress`, and is not
 * an error: the route simply has no identifier for one half of the pair.
 */
export function canResolveDepositBtcAddressWithJwt(
  chainId: ChainId | SuiChain | SolanaChain | StarknetChainId,
  token: Token = Token.LBTC,
): boolean {
  if (!ASSET_TYPE_BY_TOKEN[token]) {
    return false;
  }

  try {
    getLegacyChainNameById(chainId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Looks up or allocates the BTC deposit address for the wallet the JWT was
 * issued to.
 *
 * The JWT proves control of the destination address, so unlike
 * `generateDepositBtcAddress` this carries no destination-address signature
 * and no captcha. A network-fee approval, where one is needed, is stored with
 * the claimer on its own path and never travels with this request.
 *
 * Returns `SANCTIONED_ADDRESS` when the destination address is sanctioned,
 * matching `generateDepositBtcAddress`.
 *
 * POST /v2/addresses/deposit
 *
 * @param {IResolveDepositBtcAddressParams} parameters - The parameters for resolving the deposit address.
 * @param {string} parameters.address - The destination user address where the token will be claimed.
 * @param {ChainId} parameters.chainId - The destination chain ID.
 * @param {Token} parameters.token - The destination token, defaults to LBTC.
 * @param {string} parameters.walletJwt - The JWT from the wallet-auth flow.
 * @param {string} parameters.partnerId - The partner ID.
 * @param {string} parameters.referrerCode - The referrer code.
 * @param {number} parameters.nonce - The deposit-address nonce, defaults to 0.
 * @param {string} parameters.destinationAssetAddress - An explicit destination asset address.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @throws {UnauthorizedWalletJwtError} when the gateway rejects the JWT.
 *
 * @returns {Promise<string>} The BTC deposit address.
 */
export async function resolveDepositBtcAddress({
  address,
  chainId,
  token = Token.LBTC,
  walletJwt,
  partnerId,
  referrerCode,
  nonce = 0,
  destinationAssetAddress,
  env,
}: IResolveDepositBtcAddressParams): Promise<string> {
  const { baseApiV2Url } = getApiConfig(env);

  const requestParams = {
    chain: getLegacyChainNameById(chainId),
    destination_user_address: address,
    destination_asset_type: getDepositAssetTypeById(token),
    nonce,
    ...(destinationAssetAddress
      ? { destination_asset_address: destinationAssetAddress }
      : {}),
    ...(partnerId ? { partner_id: partnerId } : {}),
    ...(referrerCode ? { referral_code: referrerCode } : {}),
  };

  let data: IResolveDepositAddressResponse;

  try {
    ({ data } = await axios.post<IResolveDepositAddressResponse>(
      RESOLVE_ADDRESS_URL,
      requestParams,
      {
        baseURL: baseApiV2Url,
        headers: {
          Authorization: `Bearer ${walletJwt}`,
          Accept: 'application/json',
        },
        timeout: RESOLVE_ADDRESS_TIMEOUT_MS,
      },
    ));
  } catch (error) {
    // Read the status off the shape rather than through `instanceof AxiosError`
    // so a rejection that crossed a module boundary is still recognised.
    if ((error as AxiosError)?.response?.status === 401) {
      throw new UnauthorizedWalletJwtError(RESOLVE_ADDRESS_URL);
    }

    const errorMsg = getErrorMessage(error);

    if (isSanctionedAddressError(errorMsg)) {
      return SANCTIONED_ADDRESS;
    }

    throw new Error(errorMsg);
  }

  const resolvedAddress =
    data.deposit_address?.btc_address ??
    data.deposit_address?.address ??
    data.address;

  if (!resolvedAddress) {
    throw new Error('Deposit address resolution returned no address');
  }

  return resolvedAddress;
}
