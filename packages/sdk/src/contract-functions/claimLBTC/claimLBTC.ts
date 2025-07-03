import {
  BasculeDepositStatus,
  getBasculeDepositStatus,
} from '../getBasculeDepositStatus';
import type { CommonWriteParameters } from '../../common/parameters';
import { CHAIN_ID_TO_VIEM_CHAIN_MAP, isKatanaChain } from '../../common/chains';
import { makePublicClient } from '../../clients/public-client';
import { makeWalletClient } from '../../clients/wallet-client';
import { ensureHex } from '../../utils/hex';
import { type Hash, parseGwei } from 'viem';
import { getTokenContractInfo } from '../../tokens/tokens';
import { Token } from '../../tokens/token-addresses';
import { estimateGasFees } from '../../utils/gas';

export interface IClaimLBTCParams extends CommonWriteParameters {
  /**
   * Raw payload from deposit notarization.
   */
  data: string;
  /**
   * Signature from deposit notarization.
   */
  proofSignature: string;
}

/**
 * Claims LBTC.
 *
 * @param {IClaimLBTCParams} parameters - The parameters.
 * @param {string} data - The raw payload from the deposit, see `IDeposit.rawPayload`
 * @param {string} proofSignature - The signature from the deposit, see `IDeposit.signature`
 * @param {Address} parameters.account - The EVM account address.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {EIP1193Provider} parameters.provider - The EIP1193 provider.
 * @param {string} parameters.rpcUrl - The optional rpc url.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @returns {Promise<Hash>} transaction promise
 */
export async function claimLBTC({
  data,
  proofSignature,
  account,
  chainId,
  provider,
  rpcUrl,
  env,
}: IClaimLBTCParams): Promise<Hash> {
  return mintToken({
    data,
    proofSignature,
    account,
    chainId,
    provider,
    rpcUrl,
    env,
    token: Token.LBTC,
  });
}

export async function mintToken({
  data,
  proofSignature,
  account,
  chainId,
  provider,
  rpcUrl,
  env,
  token = Token.LBTC,
}: IClaimLBTCParams & { token?: Token }) {
  if (![Token.LBTC, Token.BTCK].includes(token)) {
    throw new Error('Unsupported token');
  }

  if (token === Token.BTCK && !isKatanaChain(chainId)) {
    throw new Error('Operation not permitted');
  }

  const tokenContract = getTokenContractInfo(token, chainId, env);
  const basculeStatus = await getBasculeDepositStatus({
    chainId,
    rawPayload: data,
    env,
    token,
  });

  if (basculeStatus !== BasculeDepositStatus.REPORTED) {
    switch (basculeStatus) {
      case BasculeDepositStatus.UNREPORTED:
        throw new Error(
          'The deposit cannot be claimed because it is unreported or potentially still pending, please try again later.',
        );
      case BasculeDepositStatus.WITHDRAWN:
        throw new Error(
          'The deposit cannot be claimed because it is withdrawn already.',
        );
      default: // unknown bascule deposit status
        throw new Error(
          'The deposit cannot be claimed because it is blocked by bridge security.',
        );
    }
  }

  const publicClient = makePublicClient({ chainId, rpcUrl, env });
  const walletClient = makeWalletClient({ chainId, provider });

  const callData = {
    address: tokenContract.address,
    account,
    chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
    abi: tokenContract.abi,
    functionName: token === Token.BTCK ? 'mintV1' : 'mint', // FIXME: mintV1 is the equivalent on Native LBTC contract of mint on LBTC contract, change if contract ABI changes.
    args: [ensureHex(data), ensureHex(proofSignature)],
  } as const;

  // Katana Tatara requires tip TODO: Recheck this part
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
