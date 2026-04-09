import { ec, Signature, typedData, WalletAccount } from "starknet";

import { getPublicKey, recoverFullPublicKeys } from "../utils/account";
import {
  ChainParameters,
  makeDestinationChainId,
  StarknetChainId,
} from "../utils/chains";
import { Address } from "../utils/common";
import { getRpcProvider } from "../utils/rpc-providers";
import { normalizeSignature } from "../utils/signature";
import { SIGN_MESSAGE_TYPED_DATA } from "../utils/typed-data";
import { WalletName } from "../utils/wallet-account";

type SignMessageParameters = {
  message: string;
  walletAccount: WalletAccount;
} & ChainParameters;

type SignMessageResult = {
  /** The signing account address */
  account: string;
  /** The message hash */
  hash: string;
  /** The raw signature */
  signature: Signature;
  /** The signature (compact hex format) or Ethereum signature hex string */
  signatureHex: string;
  /** The signing account pubkey */
  pubKey: string;
  typedData: unknown;
  /** A flag indicating whether the signature was verified on-chain */
  verifiedOnChain: boolean;
  verifiedOffChain:
    | {
        /** Recovered full pubkey */
        fullPubKey: string;
        /** A flag indicating whether the signature was verified off-chain */
        verified: boolean;
      }[]
    | undefined;
};

export async function signMessage({
  message,
  walletAccount,
  chainId = StarknetChainId.SN_MAIN,
}: SignMessageParameters): Promise<SignMessageResult> {
  const personalMessageTypedData = SIGN_MESSAGE_TYPED_DATA(chainId, message);
  const skipVerify = process.env.SKIP_STARKNET_VERIFY === "true";

  if (walletAccount.walletProvider.name.toLowerCase().includes("kelpr")) {
    console.warn("Keplr wallet is not fully supported.");
  }

  const hashMsg = await walletAccount.hashMessage(personalMessageTypedData);
  const signature = await walletAccount.signMessage(personalMessageTypedData);

  // Use SDK's RPC provider for read-only operations to avoid wallet RPC rate limits
  // (Wallet extensions like Braavos/ArgentX use OnFinality which has strict rate limits)
  const rpcProvider = getRpcProvider(chainId);
  const pubKey = await getPublicKey(
    walletAccount.address as Address,
    rpcProvider,
  );

  let verifiedOnChain = false;
  if (!skipVerify) {
    const provider = getRpcProvider(chainId);
    verifiedOnChain = await provider.verifyMessageInStarknet(
      hashMsg,
      signature,
      walletAccount.address,
    );
  }

  const rs = normalizeSignature(
    signature,
    walletAccount.walletProvider.name as WalletName,
  );

  let verifiedOffChain = undefined;

  if (rs instanceof ec.starkCurve.Signature) {
    const fullPubKeys = recoverFullPublicKeys(rs, hashMsg);

    verifiedOffChain = fullPubKeys.map((fpk) => {
      return {
        fullPubKey: fpk,
        verified: typedData.verifyMessage(hashMsg, rs, fpk),
      };
    });

    const tfpk = verifiedOffChain.find((x) =>
      x.fullPubKey.includes(pubKey.slice(2)),
    );
    if (tfpk) verifiedOffChain = [tfpk];
  }

  return {
    hash: hashMsg,
    typedData: personalMessageTypedData,
    signature,
    signatureHex:
      rs instanceof ec.starkCurve.Signature ? `0x${rs.toCompactHex()}` : rs,
    account: `0x${walletAccount.address.slice(2).padStart(64, "0")}`,
    pubKey,
    verifiedOnChain,
    verifiedOffChain,
  };
}

type SignLbtcDestinationAddrStarknetParameters = Omit<
  SignMessageParameters,
  "message"
>;

export async function signLbtcDestinationAddrStarknet({
  walletAccount,
  chainId = StarknetChainId.SN_MAIN,
}: SignLbtcDestinationAddrStarknetParameters) {
  return signMessage({
    walletAccount,
    chainId,
    message: `destination chain id is ${makeDestinationChainId(chainId)}`,
  });
}
