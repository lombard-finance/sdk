import { Env } from '@lombard.finance/sdk-common';
import { ChainId } from './chains';
import { Address, EIP1193Provider } from 'viem';

export interface IEnvParam {
  /**
   * Optional environment identifier. If not provided, it defaults to `prod`.
   *
   * @default Env.prod
   */
  env?: Env;
}

export interface CommonParameters extends IEnvParam {
  /**
   * Chain ID for identifying the blockchain network (e.g., Ethereum, Binance Smart Chain, etc.)
   */
  chainId: ChainId;

  /**
   * Optional RPC URL to connect to the blockchain. If not provided, a default RPC URL might be used.
   */
  rpcUrl?: string;
}

export interface CommonReadParameters extends CommonParameters {
  /**
   * The account address.
   */
  account: Address;
}

export interface CommonOptionalWriteParameters extends CommonParameters {
  /**
   * The provider (required). An instance of the `EIP1193Provider` which adheres to the EIP-1193 standard for communication with Ethereum-compatible providers.
   * @type {EIP1193Provider}
   */
  provider?: EIP1193Provider;
}

export interface CommonWriteParameters extends CommonParameters {
  /**
   * The account address.
   */
  account: Address;
  /**
   * An instance of the `EIP1193Provider` which adheres to the EIP-1193 standard for communication with Ethereum-compatible providers.
   * @type {EIP1193Provider}
   */
  provider: EIP1193Provider;
}
