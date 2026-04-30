import {
  createWalletClient,
  custom,
  EIP1193Provider,
  WalletClient } from 'viem';

import { CHAIN_ID_TO_VIEM_CHAIN_MAP, ChainId } from '../common/chains';

type MakeClientParameters = {
  provider: EIP1193Provider;
  chainId: ChainId;
};

/**
 * Creates the client for specified `chainId`.
 * @param chainId - The chain id
 * @param rpcUrl - The overridden RPC url for specified chain id.
 * @returns The public client instance
 */
export function makeWalletClient({
  provider,
  chainId }: MakeClientParameters): WalletClient {
  const chain = CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId];
  const transport = custom(provider);

  const client = createWalletClient({
    chain,
    transport });

  return client as WalletClient<typeof transport>;
}
