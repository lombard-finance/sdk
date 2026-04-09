import { WalletAccount } from "starknet";

export type WalletAccountParameters = {
  /** The starknet wallet account object */
  walletAccount: WalletAccount;
};

/** Known wallets */
export type WalletName = "Braavos" | "Argent X" | "Keplr" | "OKX Wallet";
