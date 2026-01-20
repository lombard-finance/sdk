import type { Address } from 'viem';

import type { EvmProvider } from '../config/providers';

export class WalletError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'WalletError';
  }
}

/**
 * Retrieve the active EVM account from an EIP-1193 provider.
 *
 * Attempts a silent `eth_accounts` call first, then falls back to
 * `eth_requestAccounts` to prompt the wallet if necessary.
 */
export async function getActiveEvmAccount(
  provider: EvmProvider,
): Promise<Address> {
  try {
    const accounts = (await provider.request({
      method: 'eth_accounts',
    })) as string[] | undefined;

    const account =
      accounts?.[0] ??
      (
        (await provider.request({
          method: 'eth_requestAccounts',
        })) as string[] | undefined
      )?.[0];

    if (!account) {
      throw new WalletError('Wallet not connected');
    }

    return account as Address;
  } catch (error) {
    if (error instanceof WalletError) {
      throw error;
    }
    throw new WalletError('Failed to retrieve wallet account', {
      cause: error as Error,
    });
  }
}
