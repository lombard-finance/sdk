import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";

export async function createTestSolanaWallet(secretKeyBase58: string) {
  const keypair = Keypair.fromSecretKey(bs58.decode(secretKeyBase58));
  const connection = new Connection(
    process.env.SOLANA_DEVNET_RPC || "https://api.devnet.solana.com",
    "confirmed",
  );

  return {
    keypair,
    connection,
    publicKey: keypair.publicKey,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signTransaction: async (tx: any) => {
      tx.partialSign(keypair);
      return tx;
    },
  };
}
