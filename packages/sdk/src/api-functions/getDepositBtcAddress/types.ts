import { BlockchainIdentifier } from '../../common/blockchain-identifier';
import {
  ChainId,
  SolanaChain,
  StarknetChainId,
  SuiChain,
} from '../../common/chains';
import { IEnvParam } from '../../common/parameters';
import { Token } from '../../tokens/token-addresses';

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
