import { Address } from 'viem';
import { ChainId } from '../common/chains';
import { Env, DEFAULT_ENV } from '@lombard.finance/sdk-common';
import { Token, TOKEN_ADDRESSES } from './token-addresses';

type LbtcContractAddresses = Partial<Record<ChainId, Address>>;

/**
 * Gets the collection of LBTC contract addresses based on the provided
 * environment.
 */
export function getLbtcContractAddresses(
  env: Env = DEFAULT_ENV,
): LbtcContractAddresses {
  return TOKEN_ADDRESSES[Token.LBTC]?.[env] || {};
}
