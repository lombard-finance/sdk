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
 * The asset identifiers this route accepts. A token missing here has no
 * identifier as far as this SDK is concerned, so callers fall back to the
 * signature-carrying `generateDepositBtcAddress` rather than guessing a name.
 */
const ASSET_TYPE_BY_TOKEN: Partial<Record<Token, string>> = {
  [Token.LBTC]: 'ASSET_TYPE_LBTC',
  [Token.BTCb]: 'ASSET_TYPE_BTCB',
};

interface IResolveDepositAddressResponse {
  deposit_address?: {
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
   * not resolve it from `token`. Omitted by default. Naming the asset this way
   * replaces `token` on the wire rather than narrowing it, so a token with no
   * `ASSET_TYPE_*` identifier is reachable this way.
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
 * and no captcha.
 *
 * Returns `SANCTIONED_ADDRESS` when the destination address is sanctioned,
 * matching `generateDepositBtcAddress`.
 *
 * `env` alone picks the network: a testnet chain id resolves to its mainnet
 * identifier (holesky and sepolia are both `BLOCKCHAIN_ETHEREUM`), so passing a
 * testnet chain id with `env: prod` asks the mainnet gateway for a mainnet
 * address. The pair has to be consistent at the call site.
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
 * @throws {UnauthorizedWalletJwtError} when the gateway refuses the JWT (401)
 * or the JWT does not authorise the requested address (403).
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

  // The asset type and the asset address are the same field on the wire: the
  // route rejects a request that carries both. An explicit address therefore
  // replaces the type instead of being added to it.
  const requestParams = {
    chain: getLegacyChainNameById(chainId),
    destination_user_address: address,
    nonce,
    ...(destinationAssetAddress
      ? { destination_asset_address: destinationAssetAddress }
      : { destination_asset_type: getDepositAssetTypeById(token) }),
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
    const errorMsg = getErrorMessage(error);

    if (isSanctionedAddressError(errorMsg)) {
      return SANCTIONED_ADDRESS;
    }

    // Read the status off the shape rather than through `instanceof AxiosError`
    // so a rejection that crossed a module boundary is still recognised. Both
    // statuses are the JWT being refused: 401 a token the route will not accept
    // at all, 403 one that does not authorise the requested address.
    const status = (error as AxiosError)?.response?.status;

    if (status === 401 || status === 403) {
      throw new UnauthorizedWalletJwtError(RESOLVE_ADDRESS_URL);
    }

    throw new Error(errorMsg);
  }

  const resolvedAddress = data.deposit_address?.address ?? data.address;

  if (!resolvedAddress) {
    throw new Error('Deposit address resolution returned no address');
  }

  return resolvedAddress;
}
