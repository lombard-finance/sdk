import type { Chain, PublicClient, WalletClient } from "viem";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji, sepolia } from "viem/chains";

const CHAIN_MAP = {
  sepolia,
  "avalanche-fuji": avalancheFuji,
};

interface TestEvmWallet {
  walletClient: WalletClient;
  publicClient: PublicClient;
  account: ReturnType<typeof privateKeyToAccount>;
  chain: Chain;
}

export async function createTestEvmWallet(
  privateKey: `0x${string}`,
  chainName: keyof typeof CHAIN_MAP,
): Promise<TestEvmWallet> {
  const chain = CHAIN_MAP[chainName];
  const account = privateKeyToAccount(privateKey);

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  return { walletClient, publicClient, account, chain };
}
