import BigNumber from 'bignumber.js';

import { makePublicClient } from '../../clients/public-client';
import { CommonParameters } from '../../common/parameters';
import ASSET_ROUTER_ABI from '../../tokens/abi/ASSET_ROUTER_ABI';
import { AddressKind, Token } from '../../tokens/token-addresses';
import { getTokenContractInfo, isUpgradedAbi } from '../../tokens/tokens';
import { determineEnv } from '../../utils/env';
import { fromSatoshi } from '../../utils/satoshi';

/**
 * Gets LBTC minting fee amount.
 *
 * @param {CommonParameters} parameters - The parameters.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {string} parameters.rpcUrl - The optional rpc url.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @return {Promise<BigNumber>}
 */
export async function getLBTCMintingFee(
  props: CommonParameters,
): Promise<BigNumber> {
  return getMintingFee({ token: Token.LBTC, ...props });
}

/** Gets LBTC burn commission (fee) amount. */
export async function getLBTCBurningFee(props: CommonParameters) {
  return getRedeemFee({ token: Token.LBTC, ...props });
}

export async function getMintingFee({
  token,
  chainId,
  rpcUrl,
  env,
}: { token: Token } & CommonParameters) {
  if (![Token.LBTC, Token.BTCK, Token.BTCb].includes(token)) {
    throw new Error(`Unsupported token: ${token}`);
  }

  const environment = env || determineEnv(chainId);

  const publicClient = makePublicClient({ chainId, rpcUrl, env: environment });
  const tokenContract = await getTokenContractInfo(
    token,
    chainId,
    environment,
    AddressKind.Adapter,
  );
  const tokenContractAbi = tokenContract.abi;

  let rawFeeValue = 0n;

  if (isUpgradedAbi(tokenContractAbi) || token === Token.BTCb) {
    const assetRouterAddress = await publicClient.readContract({
      abi: tokenContractAbi,
      address: tokenContract.address,
      functionName: 'getAssetRouter',
    });

    const assetRouter = {
      abi: ASSET_ROUTER_ABI,
      address: assetRouterAddress,
    };

    rawFeeValue = (await publicClient.readContract({
      abi: assetRouter.abi,
      address: assetRouter.address,
      functionName: 'maxMintCommission',
      args: [tokenContract.address],
    })) as bigint;
  } else {
    rawFeeValue = await publicClient.readContract({
      abi: tokenContract.abi,
      address: tokenContract.address,
      functionName: 'getMintFee',
    });
  }

  return fromSatoshi(String(rawFeeValue));
}

export async function getRedeemFee({
  token,
  chainId,
  rpcUrl,
  env,
}: { token: Token } & CommonParameters) {
  if (![Token.LBTC, Token.BTCK, Token.BTCb].includes(token)) {
    throw new Error(`Unsupported token: ${token}`);
  }
  const environment = env || determineEnv(chainId);

  const publicClient = makePublicClient({ chainId, rpcUrl, env: environment });
  const tokenContract = await getTokenContractInfo(
    token,
    chainId,
    environment,
    AddressKind.Adapter,
  );

  let rawFeeValue = 0n;
  if (isUpgradedAbi(tokenContract.abi) || token === Token.BTCb) {
    const assetRouterAddress = await publicClient.readContract({
      abi: tokenContract.abi,
      address: tokenContract.address,
      functionName: 'getAssetRouter',
    });

    const assetRouter = {
      abi: ASSET_ROUTER_ABI,
      address: assetRouterAddress,
    };

    // 1.
    const toNativeCommissionValue = (await publicClient.readContract({
      abi: assetRouter.abi,
      address: assetRouter.address,
      functionName: 'toNativeCommission',
      args: [tokenContract.address],
    })) as bigint;

    // 2.
    const [redeemFeeValue /* redeemForBtcMinAmountValue, isRedeemEnabled */] =
      (await publicClient.readContract({
        abi: assetRouter.abi,
        address: assetRouter.address,
        functionName: 'tokenConfig',
        args: [tokenContract.address],
      })) as [bigint];

    rawFeeValue = toNativeCommissionValue + redeemFeeValue;
  } else {
    // legacy (and BTCK v1)
    rawFeeValue = await publicClient.readContract({
      abi: tokenContract.abi,
      address: tokenContract.address,
      functionName: 'getBurnCommission',
    });
  }

  return fromSatoshi(String(rawFeeValue));
}

export async function getMinRedeemAmount({
  token,
  chainId,
  rpcUrl,
  env,
}: { token: Token } & CommonParameters) {
  if (![Token.LBTC, Token.BTCK, Token.BTCb].includes(token)) {
    throw new Error(`Unsupported token: ${token}`);
  }

  const environment = env || determineEnv(chainId);

  const publicClient = makePublicClient({ chainId, rpcUrl, env: environment });
  const tokenContract = await getTokenContractInfo(
    token,
    chainId,
    environment,
    AddressKind.Adapter,
  );

  let value = 0n;
  if (isUpgradedAbi(tokenContract.abi) || token === Token.BTCb) {
    const assetRouterAddress = await publicClient.readContract({
      abi: tokenContract.abi,
      address: tokenContract.address,
      functionName: 'getAssetRouter',
    });

    const assetRouter = {
      abi: ASSET_ROUTER_ABI,
      address: assetRouterAddress,
    };

    const [, redeemForBtcMinAmountValue] = (await publicClient.readContract({
      abi: assetRouter.abi,
      address: assetRouter.address,
      functionName: 'tokenConfig',
      args: [tokenContract.address],
    })) as [undefined, bigint];

    value = redeemForBtcMinAmountValue;
  } else {
    // legacy (and BTCK v1)
    value = 2000n; // 0.00002
  }

  return fromSatoshi(String(value));
}

/**
 * Gets the minimum transfer amount required for a successful redemption to BTC.
 *
 * The contract deducts the redeem fee from the user's input first, then verifies
 * the remaining amount meets the minimum redeem threshold. Therefore, the minimum
 * transfer amount the user must provide is `redeemFee + minRedeemAmount`.
 *
 * @param params.token - The token to redeem (LBTC, BTCK, or BTCb).
 * @param params.chainId - The chain ID where the redemption takes place.
 * @param params.rpcUrl - Optional RPC URL override.
 * @param params.env - Optional environment identifier.
 *
 * @returns The minimum transfer amount in BTC (human-readable).
 *
 * @example
 * ```ts
 * const minTransfer = await getMinRedeemAmountWithFee({
 *   token: Token.BTCb,
 *   chainId: ChainId.avalanche,
 *   env: Env.prod,
 * });
 * // e.g. BigNumber(0.000133) — user must send at least this much
 * ```
 */
export async function getMinRedeemAmountWithFee(
  params: { token: Token } & CommonParameters,
): Promise<BigNumber> {
  const [fee, minRedeem] = await Promise.all([
    getRedeemFee(params),
    getMinRedeemAmount(params),
  ]);

  return fee.plus(minRedeem);
}
