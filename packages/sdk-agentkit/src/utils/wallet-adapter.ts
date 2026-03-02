/**
 * Wallet Adapter
 *
 * Bridges AgentKit's EvmWalletProvider to the EIP-1193 provider
 * interface expected by the Lombard SDK.
 *
 * @module utils/wallet-adapter
 */

import type { EvmWalletProvider } from '@coinbase/agentkit';
import { createPublicClient, type EIP1193Provider,http } from 'viem';
import * as viemChains from 'viem/chains';

import { CHAIN_ID_TO_LOMBARD_CHAIN } from '../constants';

/**
 * Resolve a viem Chain definition by numeric chain ID string.
 */
function getViemChain(chainId: string) {
  const numericId = parseInt(chainId, 10);
  return Object.values(viemChains).find(c => c.id === numericId);
}

/**
 * Wraps an AgentKit EvmWalletProvider as an EIP-1193 provider.
 *
 * The Lombard SDK resolves providers via `ctx.getProvider('evm')` which
 * returns an EIP1193Provider.  AgentKit, however, passes a typed
 * `EvmWalletProvider`.  This adapter translates the key JSON-RPC
 * methods used by the SDK's contract-functions layer so that the two
 * systems can communicate.
 *
 * Read-only RPC calls (eth_call, eth_getBalance, etc.) are forwarded
 * to a viem PublicClient created for the wallet's chain.
 */
export function toEIP1193Provider(wp: EvmWalletProvider): EIP1193Provider {
  const address = wp.getAddress() as `0x${string}`;
  const chainId = wp.getNetwork().chainId ?? '1';
  const viemChain = getViemChain(chainId);

  const publicClient = createPublicClient({
    chain: viemChain,
    transport: http(),
  });

  const provider: EIP1193Provider = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request: async ({ method, params }: { method: string; params?: any }) => {
      switch (method) {
        case 'eth_accounts':
        case 'eth_requestAccounts':
          return [address];

        case 'eth_chainId':
          return `0x${parseInt(chainId, 10).toString(16)}`;

        case 'eth_sendTransaction':
          return wp.sendTransaction(params[0]);

        case 'personal_sign':
          return wp.signMessage(params[0]);

        case 'eth_signTypedData_v4': {
          const typedData =
            typeof params[1] === 'string' ? JSON.parse(params[1]) : params[1];
          return wp.signTypedData(typedData);
        }

        default:
          return publicClient.request({ method, params } as never);
      }
    },
  } as EIP1193Provider;

  return provider;
}

/**
 * Check whether a given chain ID maps to a Lombard-supported network.
 */
export function isSupportedChainId(chainId: string): boolean {
  return chainId in CHAIN_ID_TO_LOMBARD_CHAIN;
}
