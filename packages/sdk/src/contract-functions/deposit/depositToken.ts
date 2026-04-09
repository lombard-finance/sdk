/**
 * Asset Router deposit functionality for token swaps
 */
import BigNumber from "bignumber.js";
import { Address } from "viem";

import { makePublicClient } from "../../clients/public-client";
import { makeWalletClient } from "../../clients/wallet-client";
import { CHAIN_ID_TO_VIEM_CHAIN_MAP } from "../../common/chains";
import { CommonWriteParameters, IEnvParam } from "../../common/parameters";
import ASSET_ROUTER_ABI from "../../tokens/abi/ASSET_ROUTER_ABI";
import { AddressKind, Token } from "../../tokens/token-addresses";
import {
  fromBaseDenomination,
  getTokenContractInfo,
  retrieveTokenProperties,
  toBaseDenomination,
} from "../../tokens/tokens";
import { UnsupportedTokenFlow } from "../../utils/err";
import toBigInt from "../../utils/numbers";

const AVAILABLE_FLOWS: Array<{
  tokenIn: Token;
  tokenOut: Token;
}> = [
  {
    tokenIn: Token.BTCb,
    tokenOut: Token.LBTC,
  },
];

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

/**
 * Parameters for depositing tokens into a supported token contract.
 *
 * Extends {@link CommonWriteParameters} and {@link IEnvParam}.
 */
type DepositTokenParameters = {
  /**
   * The amount of tokens to deposit in human-readable format
   * (e.g., `1.23` for 1.23 XBTC).
   */
  amount: BigNumber.Value;
  /**
   * The input token that will be deposited.
   * Defaults to {@link Token.BTCb}.
   */
  tokenIn: Token;
  /**
   * The output token to be minted after deposit.
   * Defaults to {@link Token.LBTC}.
   */
  tokenOut: Token;
} & CommonWriteParameters &
  IEnvParam;

/* -------------------------------------------------------------------------- */
/*                               Public API                                   */
/* -------------------------------------------------------------------------- */

/**
 * Gets the AssetRouter address for a given token.
 *
 * This is useful for approving tokens before calling the deposit function.
 *
 * @param tokenIn - The input token (e.g., Token.BTCb)
 * @param chainId - The chain ID
 * @param env - The environment
 * @param rpcUrl - Optional RPC URL
 * @returns The AssetRouter address
 */
export async function getAssetRouterAddress({
  tokenIn,
  chainId,
  env,
  rpcUrl,
}: {
  tokenIn: Token;
  chainId: CommonWriteParameters["chainId"];
  env?: IEnvParam["env"];
  rpcUrl?: string;
}): Promise<Address> {
  const publicClient = makePublicClient({ chainId, rpcUrl, env });

  const adapterContractInfo = await getTokenContractInfo(
    tokenIn,
    chainId,
    env,
    AddressKind.Adapter,
  );

  const assetRouterAddress = (await publicClient.readContract({
    address: adapterContractInfo.address,
    abi: adapterContractInfo.abi,
    functionName: "getAssetRouter",
  })) as Address;

  return assetRouterAddress;
}

/**
 * Deposits tokens using the Asset Router contract to mint the corresponding output token.
 *
 * This function validates the deposit flow (input → output token), retrieves token and adapter contract
 * information, obtains the AssetRouter address, and submits a `deposit` transaction to the AssetRouter contract.
 *
 * **Note:** This function does NOT handle token approval. You must approve tokens for the AssetRouter
 * before calling this function. Use {@link getAssetRouterAddress} to get the spender address for approval.
 *
 * ---
 * **Supported flows:**
 * - BTC.b → LBTC
 *
 * ---
 * **Errors thrown:**
 * - `UnsupportedTokenDepositFlow` if the (tokenIn, tokenOut) pair is not supported
 * - `Error` if token contract properties cannot be retrieved
 * - `Error` if the deposit amount exceeds the account balance
 * - `Error` if insufficient allowance (tokens not approved)
 */
export async function depositToken({
  account: accountAddress,
  amount: amountRaw,
  chainId,
  env,
  provider,
  rpcUrl,
  tokenIn = Token.BTCb,
  tokenOut = Token.LBTC,
}: DepositTokenParameters) {
  const flow = AVAILABLE_FLOWS.find(
    (af) => af.tokenIn === tokenIn && af.tokenOut === tokenOut,
  );
  if (!flow) {
    throw new UnsupportedTokenFlow(tokenIn, tokenOut, chainId, env);
  }

  const publicClient = makePublicClient({ chainId, rpcUrl, env });
  const walletClient = makeWalletClient({ provider, chainId });

  // Get adapter contract for tokenIn (BTC.b)
  const adapterContractInfo = await getTokenContractInfo(
    tokenIn,
    chainId,
    env,
    AddressKind.Adapter,
  );

  // Get token contract for tokenIn to check balance and approve
  const tokenInContractInfo = await getTokenContractInfo(
    tokenIn,
    chainId,
    env,
    AddressKind.Token,
  );

  // Get token contract for tokenOut to pass to AssetRouter
  const tokenOutContractInfo = await getTokenContractInfo(
    tokenOut,
    chainId,
    env,
    AddressKind.Token,
  );

  const IN = await retrieveTokenProperties(publicClient, tokenInContractInfo);
  if (!IN) {
    throw new Error(
      `Could not retrieve the properties of ${tokenIn} on ${chainId}`,
    );
  }

  // Get AssetRouter address from adapter contract
  const assetRouterAddress = (await publicClient.readContract({
    address: adapterContractInfo.address,
    abi: adapterContractInfo.abi,
    functionName: "getAssetRouter",
  })) as Address;

  const amount = BigNumber(amountRaw);
  const amountBigInt = toBigInt(toBaseDenomination(amount, IN.decimals));

  // Check token balance
  const tokenInBalanceRaw = await publicClient.readContract({
    address: IN.address,
    abi: IN.abi,
    functionName: "balanceOf",
    args: [accountAddress],
  });
  const tokenInBalance = fromBaseDenomination(tokenInBalanceRaw, IN.decimals);

  if (amount.isGreaterThan(tokenInBalance)) {
    throw new Error(
      `Unable to deposit ${amount.toString()} ${IN.symbol} because the amount exceeds the account's balance of ${tokenInBalance.toString()} ${IN.symbol}`,
    );
  }

  // const isAvalanche =
  //   chainId === ChainId.avalanche || chainId === ChainId.avalancheFuji;

  // Call deposit on AssetRouter
  const hash = await walletClient.writeContract({
    address: assetRouterAddress,
    abi: ASSET_ROUTER_ABI,
    chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
    functionName: "deposit",
    args: [accountAddress, tokenOutContractInfo.address, amountBigInt],
    account: accountAddress,
  });

  return hash;
}
