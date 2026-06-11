import { BlockchainIdentifier } from '../../common/blockchain-identifier';
import {
  ChainId,
  SolanaChain,
  StarknetChainId,
  SuiChain,
} from '../../common/chains';
import { IEnvParam } from '../../common/parameters';
import { Token } from '../../tokens/token-addresses';

/**
 * Public deposit-address shape. Stable across the v1 → v2 backend migration:
 * the SDK maps the v2 response into these field names internally (see
 * {@link mapV2DepositAddress}) so consumers are insulated from backend renames.
 */
export interface IDepositAddress {
  /**
   * The deposit address for BTC.
   */
  btc_address: string;
  /**
   * The address creation timestamp.
   */
  created_at: string;
  /**
   * A flag determining whether an address is deprecated (no longer valid for depositing BTC).
   */
  deprecated?: boolean;
  /**
   * Type of an address.
   * @constant {string} - ADDRESS_TYPE_DEPOSIT
   */
  type: string;
  /**
   * A flag determining whether an address has been used.
   */
  used?: boolean;

  /**
   * The deposit address metadata
   */
  deposit_metadata: {
    /**
     * The partner (referral) id.
     */
    referral: string;
    /**
     * The partner (referral) id.
     */
    partner_id: string;
    /**
     * The destination address.
     */
    to_address: string;
    /**
     * The destination blockchain corresponding to the `to_address`
     */
    to_blockchain: BlockchainIdentifier;
    /**
     * The destination token address
     */
    token_address?: string;
    /**
     * The aux version (paired with the token_address)
     */
    aux_version?: number;
  };
}

export interface IDepositAddressesResponse {
  addresses: IDepositAddress[];
  has_more?: boolean;
}

export interface IApiError {
  code: number;
  message?: string;
}

/* -------------------------------------------------------------------------- */
/*            Internal v2 wire types + mapping (not part of the API)          */
/* -------------------------------------------------------------------------- */

/** Raw `metadata` object as returned by the v2 deposit-address endpoints. */
interface IV2DepositAddressMetadata {
  destination_chain: BlockchainIdentifier;
  destination_address: string;
  destination_asset_address?: string;
  partner_id: string;
  nonce?: number;
  aux_version?: number;
}

/** Raw deposit-address object as returned by the v2 endpoints. */
export interface IV2DepositAddress {
  address: string;
  created_at: string;
  metadata: IV2DepositAddressMetadata;
}

/** `GET /v2/addresses/deposit` response envelope. */
export interface IV2ListDepositAddressesResponse {
  deposit_addresses?: IV2DepositAddress[];
  page_info?: {
    limit: number;
    offset: number;
    total: number;
    order?: string;
  };
}

/** `GET /v2/addresses/deposit/{btc_address}` response envelope. */
export interface IV2GetDepositAddressResponse {
  deposit_address?: IV2DepositAddress;
}

/**
 * Map a v2 deposit address onto the public {@link IDepositAddress} shape.
 *
 * Keeps the SDK's external contract stable while the backend field names move
 * from v1 (`btc_address` / `deposit_metadata.{to_*, token_address, referral}`)
 * to v2 (`address` / `metadata.{destination_*, partner_id}`). The v2 list only
 * returns currently-valid addresses, so `deprecated`/`used` are left unset.
 */
export function mapV2DepositAddress(item: IV2DepositAddress): IDepositAddress {
  return {
    btc_address: item.address,
    created_at: item.created_at,
    type: 'ADDRESS_TYPE_DEPOSIT',
    deposit_metadata: {
      referral: item.metadata.partner_id,
      partner_id: item.metadata.partner_id,
      to_address: item.metadata.destination_address,
      to_blockchain: item.metadata.destination_chain,
      token_address: item.metadata.destination_asset_address,
      aux_version: item.metadata.aux_version,
    },
  };
}

export interface IGetDepositBtcAddressesParameters extends IEnvParam {
  /**
   * The destination address where LBTC will be claimed.
   */
  address: string;
  /**
   * The destination chain where the `address` exists and where LBTC will be claimed.
   */
  chainId: ChainId | SuiChain | SolanaChain | StarknetChainId;
  /**
   * The maximum number of items to return.
   * @default {number} 1
   */
  limit?: number;

  /**
   * The number of items to skip before starting to return the items.
   * @default {number} 0
   */
  offset?: number;

  /**
   * The partner (referral) id.
   * @default {string} "lombard"
   */
  partnerId?: string;
}

export type IGetDepositBtcAddressParameters = { token?: Token } & Pick<
  IGetDepositBtcAddressesParameters,
  'address' | 'chainId' | 'env' | 'partnerId'
>;
