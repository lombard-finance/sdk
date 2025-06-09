import {
  Blockchain,
  verifyAddress,
} from '@lombard.finance/btc-deposit-addresses';
import axios from 'axios';
import { getApiConfig } from '../../common/api-config';
import {
  BlockchainIdentifier,
  getChainNameById,
} from '../../common/blockchain-identifier';
import {
  ChainId,
  SUI_MAINNET_CHAIN,
  SolanaChain,
  SuiChain,
} from '../../common/chains';
import { IEnvParam } from '../../common/parameters';
import { orderBy } from '../../utils/array';

export const VERIFIABLE_CHAINS: Partial<
  Record<ChainId | SuiChain | SolanaChain, Blockchain>
> = {
  [ChainId.ethereum]: Blockchain.Ethereum,
  [ChainId.base]: Blockchain.Base,
  [ChainId.binanceSmartChain]: Blockchain.BSC,
  [ChainId.sonic]: Blockchain.Sonic,
  [SUI_MAINNET_CHAIN]: Blockchain.Sui,
};

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
    /** Nonce */
    nonce?: number;
  };
}

interface IDepositAddressesResponse {
  addresses: IDepositAddress[];
  has_more?: boolean;
}

interface IApiError {
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
  chainId: ChainId | SuiChain | SolanaChain;
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

async function makeRequest({
  address,
  chainId,
  env,
  limit,
  offset,
  partnerId,
}: IGetDepositBtcAddressesParameters) {
  const { baseApiUrl } = getApiConfig(env);

  // throws an error if `chainId` is unknown
  const destinationBlockchain = getChainNameById(chainId);

  const params = {
    asc: false,
    limit,
    offset,
    referralId: partnerId || 'lombard',
  };

  // remove undefined fields, undefined limit and offset params cause error
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) {
      delete params[k as keyof typeof params];
    }
  }

  const url = `api/v1/address/destination/${destinationBlockchain}/${address}`;
  try {
    const { data } = await axios.get<IDepositAddressesResponse>(url, {
      baseURL: baseApiUrl,
      params,
    });

    const addresses = data?.addresses ? data.addresses : [];
    return addresses.filter(a => !a.deprecated);
  } catch (err) {
    if (axios.isAxiosError<IApiError>(err)) {
      const message = err.response?.data.message;
      throw new Error(message);
    }
  }
}

export type IGetDepositBtcAddressParameters = Pick<
  IGetDepositBtcAddressesParameters,
  'address' | 'chainId' | 'env' | 'partnerId'
>;

/**
 * Returns the current address for depositing BTC by given parameters.
 *
 * @param {IGetDepositBtcAddressParameters} parameters - The parameters.
 * @param {string} parameters.address - The account address.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {Env} parameters.env - The optional environment identifier.
 * @param {string} parameters.partnerId - The partner (referral) id.
 *
 * @throws {Error} - Throws an error if no address found or the provided chain id is not supported.
 */
export async function getDepositBtcAddress({
  address,
  chainId,
  env,
  partnerId,
}: IGetDepositBtcAddressParameters) {
  const addresses = await makeRequest({
    address,
    chainId,
    env,
    partnerId,
  });

  if (!addresses || addresses.length === 0) {
    throw new Error(
      `No deposit address found for ${address} on chain ${chainId}`,
    );
  }

  const mostRecentAddress = addresses.reduce((mostRecent, cur) => {
    if (Number(cur.created_at) > Number(mostRecent.created_at)) {
      return cur;
    }
    return mostRecent;
  }, addresses[0]);

  const canVerify = Object.keys(VERIFIABLE_CHAINS).includes(String(chainId));
  if (canVerify) {
    const blockchain = VERIFIABLE_CHAINS[chainId] as Blockchain;
    const [verified, calculated] = verifyAddress(
      mostRecentAddress.btc_address,
      mostRecentAddress.deposit_metadata.nonce || 0,
      mostRecentAddress.deposit_metadata.referral || '',
      address,
      blockchain,
    );
    if (!verified) {
      throw new Error(
        `The BTC deposit address ${mostRecentAddress.btc_address} is not valid. The deposit address is not the same as expected (${calculated})`,
      );
    }
  } else {
    console.warn(
      `The BTC deposit address ${mostRecentAddress.btc_address} cannot be verified. Only the following destination chains are verifiable: ${Object.keys(VERIFIABLE_CHAINS).join(', ')}`,
    );
  }

  return mostRecentAddress.btc_address;
}

/**
 * Returns the addresses for depositing BTC by given parameters.
 * @throws {Error} - Throws an error if chain id is not supported.
 */
export async function getDepositBtcAddresses(
  parameters: IGetDepositBtcAddressesParameters,
) {
  const addresses = await makeRequest(parameters);
  return orderBy(addresses || [], a => Number(a.created_at), 'desc');
}
