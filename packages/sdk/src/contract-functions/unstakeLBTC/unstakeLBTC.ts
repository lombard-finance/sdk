import { getOutputScript } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import { Address, erc20Abi, Hex, parseGwei } from 'viem';

import { makePublicClient } from '../../clients/public-client';
import { makeWalletClient } from '../../clients/wallet-client';
import {
  CHAIN_ID_TO_VIEM_CHAIN_MAP,
  ChainId,
  isKatanaChain,
} from '../../common/chains';
import {
  CommonSignerWriteParameters,
  CommonWriteParameters,
  isProviderFlow,
} from '../../common/parameters';
import ASSET_ROUTER_ABI from '../../tokens/abi/ASSET_ROUTER_ABI';
import { AddressKind, Token } from '../../tokens/token-addresses';
import {
  fromBaseDenomination,
  getTokenContractInfo,
  isUpgradedAbi,
  retrieveTokenProperties,
  toBaseDenomination,
} from '../../tokens/tokens';
import { UnsupportedTokenFlow } from '../../utils/err';
import { estimateGasFees } from '../../utils/gas';
import toBigInt from '../../utils/numbers';
import {
  executeContractTransaction,
  waitForTransactionReceipt,
} from '../../utils/transaction-executor';

/**
 * Supported redemption flows.
 *
 * - If `tokenOut` is `undefined`, the redemption defaults to **BTC**
 *   and requires a BTC address as the destination.
 * - Otherwise, redemption will return the specified output token.
 */
const AVAILABLE_FLOWS: Array<{
  /** The token being redeemed */
  tokenIn: Token;
  /** The token received after redemption (or `undefined` for BTC) */
  tokenOut?: Token;
}> = [
  // Redeem to BTC
  { tokenIn: Token.LBTC }, // -> BTC
  { tokenIn: Token.BTCb }, // -> BTC
  { tokenIn: Token.BTCK }, // -> BTC

  // Redeem to wrapped tokens
  { tokenIn: Token.LBTC, tokenOut: Token.BTCb }, // -> Native LBTC
  { tokenIn: Token.LBTC, tokenOut: Token.BTCK }, // -> Native LBTC
];

type RedeemTokenParameters = {
  /**
   * The amount to redeem, expressed in human-readable format.
   *
   * For example, use `"1.23"` to represent 1.23 LBTC.
   */
  amount: BigNumber.Value;
  /**
   * (Optional) Destination BTC address for redemption.
   *
   * Required if {@link tokenOut} is omitted (since the default
   * redemption flow sends BTC).
   */
  btcAddress?: string;
  /**
   * The token to be redeemed.
   *
   * Defaults to {@link Token.LBTC}.
   */
  tokenIn: Token;
  /**
   * (Optional) The token to receive after redemption.
   *
   * - If provided, redemption will return the specified token.
   * - If omitted, redemption defaults to BTC and a {@link btcAddress}
   *   must be supplied.
   */
  tokenOut?: Token;
};

/**
 * Union type for redeem token parameters supporting both provider and signer flows.
 */
type RedeemTokenParams =
  | (RedeemTokenParameters & CommonWriteParameters)
  | (RedeemTokenParameters & CommonSignerWriteParameters);

/**
 * Parameters required to unstake (redeem) LBTC into BTC.
 *
 * Overrides {@link RedeemTokenParameters} to make `btcAddress` required,
 * since unstaking always goes to BTC.
 */
export type IUnstakeLBTCParams =
  | (RedeemTokenParameters & CommonWriteParameters & { btcAddress: string })
  | (RedeemTokenParameters &
      CommonSignerWriteParameters & { btcAddress: string });

/**
 * Redeems a token into **BTC** or another supported token.
 *
 * @remarks
 * This is the **preferred** API for all redemption flows.
 * - If `tokenOut` is `undefined`, redemption sends BTC and requires a valid BTC address.
 * - If `tokenOut` is provided, redemption swaps to the target token
 *   (requires an upgraded token contract ABI).
 *
 * Supports two execution modes:
 * 1. **Provider flow** (legacy): Pass `provider: EIP1193Provider`
 * 2. **Signer flow** (unified bridge): Pass `signer: SignerAdapter`
 *
 * @param params - Parameters including the source token, amount, and either provider or signer.
 * @returns Transaction hash of the executed redemption transaction.
 *
 * @throws {UnsupportedTokenFlow} If the requested flow is not supported.
 * @throws {Error} If balances are insufficient or required parameters are missing.
 * @throws {SignerError} If transaction execution fails (with detailed context).
 *
 * @example
 * ```ts
 * // Provider flow (legacy)
 * const txHash = await redeemToken({
 *   provider,
 *   account: '0x...',
 *   amount: '1.5',
 *   btcAddress: 'bc1q...',
 *   chainId: ChainId.ethereum,
 *   env: Env.prod,
 *   tokenIn: Token.LBTC,
 * });
 *
 * // Signer flow (unified bridge)
 * const txHash = await redeemToken({
 *   signer: evmSigner,
 *   account: '0x...',
 *   amount: '1.5',
 *   btcAddress: 'bc1q...',
 *   chainId: ChainId.avalancheFuji,
 *   env: Env.testnet,
 *   tokenIn: Token.BTCb,
 * });
 * ```
 */
export async function redeemToken(params: RedeemTokenParams): Promise<Hex> {
  const {
    account: accountAddress,
    amount: amountRaw,
    btcAddress,
    chainId,
    env,
    rpcUrl,
    tokenIn = Token.LBTC,
    tokenOut,
  } = params;
  const flow = AVAILABLE_FLOWS.find(
    af => af.tokenIn === tokenIn && af.tokenOut === tokenOut,
  );
  if (!flow) {
    throw new UnsupportedTokenFlow(tokenIn, tokenOut || 'BTC', chainId, env);
  }

  const publicClient = makePublicClient({ chainId, rpcUrl, env });

  // Create wallet client only for provider flow
  const walletClient = isProviderFlow(params)
    ? makeWalletClient({ provider: params.provider, chainId })
    : undefined;

  const tokenInContractInfo = await getTokenContractInfo(
    tokenIn,
    chainId,
    env,
    AddressKind.Token, // get the token contract, not adapter
  );
  const IN = await retrieveTokenProperties(publicClient, tokenInContractInfo);
  if (!IN) {
    throw new Error(
      `Could not retrieve the properties of ${tokenIn} on ${chainId}`,
    );
  }

  const amount = toBaseDenomination(amountRaw, IN.decimals);

  const tokenInBalanceRaw = await publicClient.readContract({
    address: IN.address,
    abi: IN.abi as typeof erc20Abi,
    functionName: 'balanceOf',
    args: [accountAddress],
  });
  const tokenInBalance = fromBaseDenomination(tokenInBalanceRaw, IN.decimals);
  if (amount.isGreaterThan(tokenInBalanceRaw)) {
    throw new Error(
      `Unable to redeem ${String(amountRaw)} ${IN.symbol} because the amount exceeds the account's balance of ${tokenInBalance.toString()} ${IN.symbol}`,
    );
  }

  // -> BTC
  if (!tokenOut) {
    if (!btcAddress) {
      throw new Error('Missing parameter: `btcAddress`.');
    }
    const outputScript = await getOutputScript(btcAddress, env);

    // The redemption of BTC.b -> BTC on Avalanche requires extra steps
    if (
      tokenIn === Token.BTCb &&
      (chainId === ChainId.avalanche || chainId === ChainId.avalancheFuji)
    ) {
      // 0. `IN` is a token contract (BTC.b)
      // 1. Get the adapter and asset route contracts
      const adapter = await getTokenContractInfo(
        tokenIn,
        chainId,
        env,
        AddressKind.Adapter,
      );
      const assetRouterContractAddress = (await publicClient.readContract({
        address: adapter.address,
        abi: adapter.abi,
        functionName: 'getAssetRouter',
      })) as Address;

      // 2. Check allowance
      const allowance = await publicClient.readContract({
        address: IN.address,
        abi: IN.abi,
        functionName: 'allowance',
        args: [accountAddress, adapter.address],
      });

      if (amount.isGreaterThan(allowance)) {
        const { txHash } = await executeContractTransaction({
          params,
          publicClient,
          walletClient,
          simulateArgs: {
            address: IN.address,
            abi: IN.abi,
            account: accountAddress as `0x${string}` | undefined,
            functionName: 'approve',
            args: [adapter.address, toBigInt(amount)],
          },
          operation: 'BTC.b approval',
        });

        const receipt = await waitForTransactionReceipt(
          publicClient,
          txHash,
          'BTC.b approval',
        );

        console.info(
          `Approved adapter (${adapter.address}) for ${new BigNumber(amountRaw).toString()} ${IN.symbol}`,
          receipt.transactionHash,
          receipt.status,
        );
      }

      // 3. Run `redeemForBtc` on AssetRouter
      const { txHash } = await executeContractTransaction({
        params,
        publicClient,
        walletClient,
        simulateArgs: {
          address: assetRouterContractAddress,
          abi: ASSET_ROUTER_ABI,
          account: accountAddress as `0x${string}` | undefined,
          functionName: 'redeemForBtc',
          args: [
            accountAddress,
            adapter.address,
            outputScript,
            toBigInt(amount),
          ],
        },
        operation: 'BTC.b redeemForBtc',
      });

      return txHash;
    }

    // 0. IN is BTC.b token contract.
    const callData = {
      abi: IN.abi,
      address: IN.address,
      account: accountAddress,
      chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
      functionName:
        isUpgradedAbi(IN.abi) || tokenIn === Token.BTCb
          ? 'redeemForBtc' // upgraded
          : 'redeem', // legacy
      args: [outputScript, toBigInt(amount)],
    } as const;

    const gasEstimationData = isKatanaChain(chainId)
      ? await estimateGasFees(publicClient, callData, parseGwei('1'))
      : {};

    const { txHash } = await executeContractTransaction({
      params,
      publicClient,
      walletClient,
      simulateArgs: {
        ...callData,
        account: accountAddress as `0x${string}` | undefined,
        ...gasEstimationData,
      },
      operation: `${tokenIn} redeem to BTC`,
    });

    return txHash;
  }

  // -> tokenOut
  if (!isUpgradedAbi(IN.abi)) {
    throw new Error(
      `The ${tokenIn} contract (${IN.address}) doesn't support redemptions to ${tokenOut}.`,
    );
  }

  const callData = {
    abi: IN.abi,
    address: IN.address,
    account: accountAddress,
    chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
    functionName: 'redeem',
    args: [toBigInt(amount)],
  } as const;

  const gasEstimationData = isKatanaChain(chainId)
    ? await estimateGasFees(publicClient, callData, parseGwei('1'))
    : {};

  const { txHash } = await executeContractTransaction({
    params,
    publicClient,
    walletClient,
    simulateArgs: {
      ...callData,
      account: accountAddress as `0x${string}` | undefined,
      ...gasEstimationData,
    },
    operation: `${tokenIn} redeem to ${tokenOut}`,
  });

  return txHash;
}

/**
 * Convenience wrapper around {@link redeemToken} for redeeming **LBTC → BTC**.
 *
 * @remarks
 * This is a helper for the common "unstake LBTC" flow.
 * For more flexible redemptions (e.g. LBTC → BTCK), use {@link redeemToken} directly.
 *
 * Supports both provider and signer flows.
 *
 * @param params - See {@link IUnstakeLBTCParams}.
 * @returns Transaction hash of the redemption transaction.
 *
 * @example
 * ```ts
 * // Provider flow
 * const txHash = await unstakeLBTC({
 *   provider,
 *   account: '0x...',
 *   btcAddress: 'bc1q...',
 *   amount: '1.5',
 *   chainId: ChainId.ethereum,
 *   env: Env.prod,
 * });
 *
 * // Signer flow
 * const txHash = await unstakeLBTC({
 *   signer: evmSigner,
 *   account: '0x...',
 *   btcAddress: 'bc1q...',
 *   amount: '1.5',
 *   chainId: ChainId.ethereum,
 *   env: Env.prod,
 * });
 * ```
 */
export async function unstakeLBTC(params: IUnstakeLBTCParams): Promise<Hex> {
  return redeemToken({
    ...params,
    tokenIn: Token.LBTC,
    tokenOut: undefined,
  });
}
