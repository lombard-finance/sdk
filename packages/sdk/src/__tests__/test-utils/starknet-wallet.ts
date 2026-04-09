import { Account, RpcProvider } from "starknet";

const STARKNET_SEPOLIA_RPC =
  process.env.STARKNET_SEPOLIA_RPC ||
  "https://starknet-sepolia.public.blastapi.io";

export function createStarknetWallet(address: string, privateKey: string) {
  const provider = new RpcProvider({ nodeUrl: STARKNET_SEPOLIA_RPC });
  return new Account(provider, address, privateKey);
}
