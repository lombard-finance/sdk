import BigNumber from 'bignumber.js';
import { makePublicClient } from '../../clients/public-client';
import { CommonParameters } from '../../common/parameters';
import ASSET_ROUTER_ABI from '../../tokens/abi/ASSET_ROUTER_ABI';
import { Token } from '../../tokens/token-addresses';
import { getTokenContractInfo, isSTLBTCAbi } from '../../tokens/tokens';
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
  if (![Token.LBTC, Token.BTCK, Token.NativeLBTC].includes(token)) {
    throw new Error(`Unsupported token: ${token}`);
  }

  const environment = env || determineEnv(chainId);

  const publicClient = makePublicClient({ chainId, rpcUrl, env: environment });
  const tokenContract = getTokenContractInfo(token, chainId, environment);
  const tokenContractAbi = tokenContract.abi;

  let rawFeeValue = 0n;

  if (isSTLBTCAbi(tokenContractAbi) || token === Token.NativeLBTC) {
    const assetRouterAddress = await publicClient.readContract({
      abi: tokenContractAbi,
      address: tokenContract.address,
      functionName: 'getAssetRouter',
    });

    const assetRouter = {
      abi: ASSET_ROUTER_ABI,
      address: assetRouterAddress,
    };

    rawFeeValue = await publicClient.readContract({
      abi: assetRouter.abi,
      address: assetRouter.address,
      functionName: 'maxMintCommission',
    });
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
  if (![Token.LBTC, Token.BTCK, Token.NativeLBTC].includes(token)) {
    throw new Error(`Unsupported token: ${token}`);
  }

  const environment = env || determineEnv(chainId);

  const publicClient = makePublicClient({ chainId, rpcUrl, env: environment });
  const tokenContract = getTokenContractInfo(token, chainId, environment);

  let rawFeeValue = 0n;
  if (
    (token === Token.LBTC && isSTLBTCAbi(tokenContract.abi)) ||
    token === Token.NativeLBTC
  ) {
    const nativeTokenContract = getTokenContractInfo(
      Token.NativeLBTC,
      chainId,
      environment,
    );

    const assetRouterAddress = await publicClient.readContract({
      abi: tokenContract.abi,
      address: tokenContract.address,
      functionName: 'getAssetRouter',
    });

    const assetRouter = {
      abi: ASSET_ROUTER_ABI,
      address: assetRouterAddress,
    };

    const toNativeCommissionValue = await publicClient.readContract({
      abi: assetRouter.abi,
      address: assetRouter.address,
      functionName: 'toNativeCommission',
    });

    const [redeemFeeValue /* redeemForBtcMinAmountValue, isRedeemEnabled */] =
      await publicClient.readContract({
        abi: assetRouter.abi,
        address: assetRouter.address,
        functionName: 'tokenConfig',
        args: [nativeTokenContract.address],
      });

    if (token === Token.LBTC) {
      rawFeeValue = toNativeCommissionValue + redeemFeeValue;
    } else {
      rawFeeValue = redeemFeeValue;
    }
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
