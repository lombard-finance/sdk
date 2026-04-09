import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { sha256 } from "js-sha256";

export class MintPayload {
  prefix: string;
  chainId: string;
  destinationAddress: string;
  amount: string;
  txId: string;
  vout: string;

  constructor(hex: string) {
    this.prefix = hex.slice(0, 8);
    this.chainId = hex.slice(8, 72);
    this.destinationAddress = hex.slice(72, 136);
    this.amount = hex.slice(136, 200);
    this.txId = hex.slice(200, 264);
    this.vout = hex.slice(264);
  }

  hex(): string {
    return (
      this.prefix +
      this.chainId +
      this.destinationAddress +
      this.amount +
      this.txId +
      this.vout
    );
  }

  bytes(): Buffer {
    return Buffer.from(this.hex(), "hex");
  }

  hash(): string {
    return sha256(this.bytes() as unknown as Uint8Array);
  }

  hashAsBytes(): Buffer {
    return Buffer.from(this.hash(), "hex");
  }

  recipientPubKey(): PublicKey {
    const address = bs58.encode(
      Buffer.from(this.destinationAddress, "hex") as unknown as Uint8Array,
    );
    return new PublicKey(address);
  }

  amountBigInt(): bigint {
    return BigInt(`0x${this.amount}`);
  }
}
