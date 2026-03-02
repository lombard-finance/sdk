/**
 * Chain Mapping Utilities
 *
 * Converts between AgentKit Network and Lombard Chain identifiers.
 *
 * @module utils/chain-mapping
 */

import { Chain } from '@lombard.finance/sdk';

import {
  CHAIN_ID_TO_LOMBARD_CHAIN,
  CHAIN_ID_TO_NAME,
  SUPPORTED_CHAIN_IDS,
} from '../constants';

type LombardChain = (typeof Chain)[keyof typeof Chain];

/**
 * Network shape from AgentKit (avoids hard dependency on the agentkit package
 * just for this type).
 */
interface AgentKitNetwork {
  protocolFamily: string;
  networkId?: string;
  chainId?: string;
}

/**
 * Resolve AgentKit Network to Lombard Chain identifier.
 *
 * @throws {Error} If the chain is not supported by Lombard.
 */
export function toLombardChain(network: AgentKitNetwork): LombardChain {
  const chainId = network.chainId;

  if (!chainId || !SUPPORTED_CHAIN_IDS.has(chainId)) {
    const name = chainId ? (CHAIN_ID_TO_NAME[chainId] ?? chainId) : 'unknown';
    throw new Error(
      `Lombard does not support chain ${name}. ` +
        `Supported chains: ${getSupportedChainNames().join(', ')}.`,
    );
  }

  return CHAIN_ID_TO_LOMBARD_CHAIN[chainId];
}

/**
 * Check whether a given AgentKit Network is supported by Lombard.
 */
export function isNetworkSupported(network: AgentKitNetwork): boolean {
  return (
    network.protocolFamily === 'evm' &&
    !!network.chainId &&
    SUPPORTED_CHAIN_IDS.has(network.chainId)
  );
}

/**
 * Human-readable list of supported chain names (for LLM error messages).
 */
export function getSupportedChainNames(): string[] {
  return [...SUPPORTED_CHAIN_IDS].map(
    id => CHAIN_ID_TO_NAME[id] ?? `chainId:${id}`,
  );
}
