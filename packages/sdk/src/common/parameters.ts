import type { LombardAuth } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';
import { Address, EIP1193Provider } from 'viem';

import { SignerAdapter } from '../clients/evm-signer-adapter';
import { ChainId } from './chains';

export interface IEnvParam {
  /**
   * Optional environment identifier. If not provided, it defaults to `prod`.
   *
   * @default Env.prod
   */
  env?: Env;
  /**
   * Reads the caller's current wallet-auth JWT, or `undefined`.
   *
   * When supplied and yielding a token, `utils/http` adds an
   * `Authorization: Bearer <token>` header. When absent, or yielding
   * `undefined`, no header is sent — which is the behaviour of every endpoint
   * today, none of which requires one.
   *
   * It sits beside `env` because the two travel together: an api-function needs
   * to know which gateway to call and, soon, who is calling. Action classes pass
   * `ctx.getAuthToken` straight through.
   */
  /**
   * How to obtain a wallet JWT for this call. Inherited from
   * `LombardConfig.auth` when the SDK builds the call, and passable directly
   * by a standalone caller.
   */
  auth?: LombardAuth;
  /** @deprecated Cannot refresh. Prefer {@link auth}. */
  getAuthToken?: () => string | undefined;
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

/**
 * Common write parameters using an EIP-1193 provider (legacy flow).
 */
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

/**
 * Common write parameters using a SignerAdapter (unified bridge flow).
 */
export interface CommonSignerWriteParameters extends CommonParameters {
  /**
   * The account address.
   */
  account: Address;
  /**
   * A SignerAdapter instance for transaction signing (compatible with unified bridge EvmSigner).
   * @type {SignerAdapter}
   */
  signer: SignerAdapter;
}

/**
 * Type guard to check if parameters use provider flow.
 */
export function isProviderFlow(
  params: CommonWriteParameters | CommonSignerWriteParameters,
): params is CommonWriteParameters {
  return 'provider' in params;
}

/**
 * Type guard to check if parameters use signer flow.
 */
export function isSignerFlow(
  params: CommonWriteParameters | CommonSignerWriteParameters,
): params is CommonSignerWriteParameters {
  return 'signer' in params;
}
