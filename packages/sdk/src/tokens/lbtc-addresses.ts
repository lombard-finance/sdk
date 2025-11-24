import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import { Address } from 'viem';
import { ChainId } from '../common/chains';
import { EVM_LBTC_ADDRESSES } from './token-addresses';

type LbtcContractAddresses = Partial<Record<ChainId, Address>>;

/**
 * Gets the collection of LBTC contract addresses based on the provided
 * environment.
 */
export function getLbtcContractAddresses(
  env: Env = DEFAULT_ENV,
): LbtcContractAddresses {
  const found = EVM_LBTC_ADDRESSES?.[env];
  return found || {};
}
