import { Hash, parseGwei } from 'viem';
import { makePublicClient } from '../../clients/public-client';
import { makeWalletClient } from '../../clients/wallet-client';
import { CHAIN_ID_TO_VIEM_CHAIN_MAP, isKatanaChain } from '../../common/chains';
import { CommonWriteParameters } from '../../common/parameters';
import { AddressKind, Token } from '../../tokens/token-addresses';
import { getTokenContractInfo } from '../../tokens/tokens';
import { estimateGasFees } from '../../utils/gas';
import { ensureHex } from '../../utils/hex';
import {
  BasculeDepositStatus,
  getBasculeDepositStatus,
} from '../getBasculeDepositStatus';

export interface IClaimLBTCParams extends CommonWriteParameters {
  /**
   * The raw payload from deposit notarization, see `Deposit.rawPayload`.
   */
  data: string;
  /**
   * The proof signature from deposit notarization, see `Deposit.proof`.
   */
  proofSignature: string;
}

/**
 * Mints a specified token (LBTC or NativeLBTC) from a notarized deposit.
 *
 * This is the primary function for claiming tokens from a deposit notarization.
 *
 * It performs the following steps:
 * 1. Validates that the token is supported.
 * 2. Checks chain restrictions.
 * 3. Fetches the token contract information.
 * 4. Checks the deposit status via Bascule.
 * 5. Prepares the transaction call data and estimates gas fees if on Katana.
 * 6. Simulates the contract call and executes the transaction via the provided wallet.
 *
 * @param {Object} params - The parameters.
 * @param {string} params.data - Raw payload from the deposit notarization (`Deposit.rawPayload`).
 * @param {string} params.proofSignature - Signature from the deposit notarization (`Deposit.proof`).
 * @param {Address} params.account - The EVM account address that will receive the tokens.
 * @param {ChainId} params.chainId - The chain ID of the target blockchain network.
 * @param {EIP1193Provider} params.provider - The connected wallet provider.
 * @param {string} [params.rpcUrl] - Optional RPC URL for the blockchain network.
 * @param {Env} [params.env] - Optional environment identifier (e.g., `prod`, `staging`).
 * @param {Token} [params.token=Token.LBTC] - The token to mint. Defaults to LBTC.
 *
 * @returns {Promise<Hash>} Resolves with the transaction hash of the mint operation.
 *
 * @throws Will throw an error if:
 * - The token is unsupported.
 * - BTCK minting is attempted on a non-Katana chain.
 * - The deposit is unreported, withdrawn, or blocked by bridge security.
 */
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
  if (![Token.LBTC, Token.BTCK, Token.BTCb].includes(token)) {
    throw new Error('Unsupported token');
  }

  if (token === Token.BTCK && !isKatanaChain(chainId)) {
    throw new Error('Operation not permitted');
  }

  const tokenContract = await getTokenContractInfo(
    token,
    chainId,
    env,
    AddressKind.Adapter,
  );
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
    functionName:
      token === Token.BTCK || token === Token.BTCb ? 'mintV1' : 'mint',
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

/**
 * Convenience wrapper for minting LBTC from a deposit notarization.
 *
 * Internally calls `mintToken` with the `Token.LBTC` argument.
 *
 * @param {IClaimLBTCParams} params - The parameters for claiming LBTC.
 * @returns {Promise<Hash>} Resolves with the transaction hash of the LBTC mint operation.
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
