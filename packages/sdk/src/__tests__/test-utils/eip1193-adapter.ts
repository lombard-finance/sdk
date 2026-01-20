import type { EIP1193Provider, WalletClient } from 'viem';

/**
 * Adapts a viem WalletClient to EIP-1193 Provider interface
 * This allows using private keys with SDK that expects EIP-1193
 */
export function walletClientToProvider(client: WalletClient): EIP1193Provider {
  return {
    request: async ({ method, params }: { method: string; params?: unknown[] }) => {
      switch (method) {
        case 'eth_accounts':
        case 'eth_requestAccounts':
          return client.account ? [client.account.address] : [];

        case 'eth_chainId':
          return client.chain?.id ? `0x${client.chain.id.toString(16)}` : '0x1';

        case 'eth_sendTransaction': {
          const [txParams] = params as [Parameters<typeof client.sendTransaction>[0]];
          return client.sendTransaction(txParams);
        }

        case 'eth_signTypedData_v4': {
          const [, typedData] = params as [string, string];
          const data = JSON.parse(typedData);
          return client.signTypedData({
            account: client.account!,
            ...data,
          });
        }

        case 'personal_sign': {
          const [message] = params as [string, string];
          return client.signMessage({
            account: client.account!,
            message: { raw: message as `0x${string}` },
          });
        }

        default:
          throw new Error(`Method not implemented: ${method}`);
      }
    },
    on: () => {},
    removeListener: () => {},
  } as EIP1193Provider;
}

