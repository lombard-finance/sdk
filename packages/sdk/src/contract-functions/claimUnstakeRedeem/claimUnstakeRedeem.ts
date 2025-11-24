import { Hash, parseGwei, zeroAddress } from 'viem';
import { CommonWriteParameters } from '../../common/parameters';
import ASSET_ROUTER_ABI from '../../tokens/abi/ASSET_ROUTER_ABI';
import { makePublicClient } from '../../clients/public-client';
import { makeWalletClient } from '../../clients/wallet-client';
import { CHAIN_ID_TO_VIEM_CHAIN_MAP, isKatanaChain } from '../../common/chains';
import { AddressKind, Token } from '../../tokens/token-addresses';
import { ensureHex } from '../../utils/hex';
import { estimateGasFees } from '../../utils/gas';
import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import { getTokenContractInfo } from '../../tokens/tokens';

/**
 * Parameters for claiming BTC.b from unstake redemptions
 */
export interface IClaimUnstakeRedeemParams extends CommonWriteParameters {
  /** Raw payload from the unstake redemption (`Unstake.rawPayload`) */
  data: string;

  /** Signature/proof from the unstake redemption (`Unstake.proof`) */
  proofSignature: string;
}

/**
 * Claims BTC.b tokens from an unstake redemption (LBTC → BTC.b)
 *
 * This function is specifically for claiming native chain redemptions after the 7-day unstaking period.
 * Unlike deposits which use `adapter.mintV1`, unstake redemptions use `assetRouter.mint`.
 *
 * Business Rules:
 * - Only works for native chain redemptions (LBTC → BTC.b)
 * - Requires notarization status = SESSION_APPROVED
 * - Requires session state = COMPLETED
 * - Must be called after 7 days from unstake
 *
 * @param params - Parameters for claiming
 * @returns Transaction hash of the claim operation
 *
 * @throws Error if claiming fails or if action selector doesn't match
 */
export async function claimUnstakeRedeem({
  data,
  proofSignature,
  account,
  chainId,
  provider,
  rpcUrl,
  env = DEFAULT_ENV,
}: IClaimUnstakeRedeemParams): Promise<Hash> {
  const publicClient = makePublicClient({ chainId, rpcUrl, env });
  const walletClient = makeWalletClient({ chainId, provider });

  // Get AssetRouter address from BTCb token adapter
  const btcbTokenContract = await getTokenContractInfo(
    Token.BTCb,
    chainId,
    env,
    AddressKind.Adapter,
  );

  // Read AssetRouter address from token adapter
  const assetRouterAddress = await publicClient.readContract({
    address: btcbTokenContract.address,
    abi: btcbTokenContract.abi,
    functionName: 'getAssetRouter',
  });

  if (!assetRouterAddress || assetRouterAddress === zeroAddress) {
    throw new Error('AssetRouter address not found in token adapter');
  }

  // Call AssetRouter.mint function
  const callData = {
    address: assetRouterAddress,
    account,
    chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
    abi: ASSET_ROUTER_ABI,
    functionName: 'mint',
    args: [ensureHex(data), ensureHex(proofSignature)],
  } as const;

  const gasEstimationData = isKatanaChain(chainId)
    ? await estimateGasFees(publicClient, callData, parseGwei('1'))
    : {};

  const { request } = await publicClient.simulateContract({
    ...callData,
    ...gasEstimationData,
  });

  const txHash = await walletClient.writeContract(request);

  return txHash;
}
