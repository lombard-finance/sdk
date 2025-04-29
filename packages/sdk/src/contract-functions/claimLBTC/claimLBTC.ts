import {
  BasculeDepositStatus,
  getBasculeDepositStatus,
} from '../getBasculeDepositStatus';
import { CommonWriteParameters } from '../../common/parameters';
import { CHAIN_ID_TO_VIEM_CHAIN_MAP } from '../../common/chains';
import { makePublicClient } from '../../clients/public-client';
import { makeWalletClient } from '../../clients/wallet-client';
import { ensureHex } from '../../utils/hex';
import { Hash } from 'viem';
import { getTokenContractInfo } from '../../tokens/tokens';
import { Token } from '../../tokens/token-addresses';

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
  const lbtcContract = getTokenContractInfo(Token.LBTC, chainId, env);

  // Check the deposit status against Bascule Drawbridge security.
  // Block any deposit that is not reported.
  const basculeStatus = await getBasculeDepositStatus({
    chainId,
    rawPayload: data,
    env,
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

  const publicClient = makePublicClient({ chainId, rpcUrl });
  const walletClient = makeWalletClient({ chainId, provider });

  const { request } = await publicClient.simulateContract({
    address: lbtcContract.address,
    account,
    chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
    abi: lbtcContract.abi,
    functionName: 'mint',
    args: [ensureHex(data), ensureHex(proofSignature)],
  });

  const txHash = await walletClient.writeContract(request);

  return txHash;
}
