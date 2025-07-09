import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import {
  ByteArray,
  Client,
  PublicClient,
  getContract,
  keccak256,
  zeroAddress,
} from 'viem';
import { IDeposit } from '../../api-functions/getDepositsByAddress/getDepositsByAddress';
import { makePublicClient } from '../../clients/public-client';
import { makeWalletClient } from '../../clients/wallet-client';
import { CommonOptionalWriteParameters } from '../../common/parameters';
import LBTC_BASCULE_ABI from '../../tokens/abi/LBTC_BASCULE_ABI.json';
import { Token } from '../../tokens/token-addresses';
import { getTokenContractInfo } from '../../tokens/tokens';
import { getErrorMessage } from '../../utils/err';

/**
 * The bascule drawbridge deposit status.
 */
export enum BasculeDepositStatus {
  /**
   * The value representing that the deposit is unreported or potentially
   * still pending.
   */
  UNREPORTED = 0,
  /**
   * The value representing that the deposit is reported.
   */
  REPORTED = 1,
  /**
   * The value representing that the deposit has already been withdrawn.
   */
  WITHDRAWN = 2,
}

export interface IGetBasculeDepositStatusParameters
  extends CommonOptionalWriteParameters {
  /**
   * The deposit for which the bascule status will be checked.
   * You can omit `rawPayload` parameter if `deposit` is provided.
   */
  deposit?: IDeposit;
  /**
   * The `rawPayload` of the deposit for which the bascule status
   * will be checked.
   * You can omit `deposit` parameter if `rawPayload` is provided.
   */
  rawPayload?: string;
  token?: Token;
}

/**
 * Gets the Bascule drawbridge deposit status for given deposit.
 * @param {IGetBasculeDepositStatusParameters} parameters - The parameters.
 * @param {IDeposit} parameters.deposit - The deposit for which the bascule status will be checked. You can omit `rawPayload` parameter if `deposit` is provided.
 * @param {string} parameters.rawPayload - The `rawPayload` of the deposit for which the bascule status will be checked. You can omit `deposit` parameter if `rawPayload` is provided.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {EIP1193Provider} parameters.provider - The optional EIP1193 provider.
 * @param {string} parameters.rpcUrl - The optional rpc url.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @returns {Promise<BasculeDepositStatus>}
 */
export async function getBasculeDepositStatus({
  deposit,
  rawPayload,
  provider,
  chainId,
  rpcUrl,
  env = DEFAULT_ENV,
  token = Token.LBTC,
}: IGetBasculeDepositStatusParameters) {
  const payload = deposit?.rawPayload || rawPayload;

  if (!payload) {
    throw new Error(
      "No 'rawPayload' or 'deposit' data provided. Please provide 'rawPayload' or 'deposit' parameter.",
    );
  }

  const publicClient = makePublicClient({ chainId, rpcUrl, env });
  const tokenContractInfo = getTokenContractInfo(token, chainId, env);

  const basculeContractAddress = await publicClient.readContract({
    abi: tokenContractInfo.abi,
    address: tokenContractInfo.address,
    functionName: 'Bascule',
  });

  // If there's no bascule contract address on the LBTC contract then return
  // the the deposit is ok (REPORTED).
  if (basculeContractAddress === zeroAddress) {
    return BasculeDepositStatus.REPORTED;
  }

  let client: PublicClient | Client | undefined = undefined;
  if (!provider) {
    client = makePublicClient({ chainId, rpcUrl });
  } else {
    client = makeWalletClient({ provider, chainId });
  }

  if (!client) {
    throw new Error(
      "Could not determine the client for the contract interactions. Please provide the 'provider' and 'chainId' parameters or 'chainId' and optionally the 'rpcUrl' parameter.",
    );
  }

  try {
    const basculeContract = getContract({
      abi: LBTC_BASCULE_ABI,
      address: basculeContractAddress,
      client,
    });

    const basculeDepositId = keccak256(
      Buffer.from(payload.slice(8), 'hex') as unknown as ByteArray,
    );

    const status = await basculeContract.read.depositHistory([
      basculeDepositId,
    ]);
    return status as BasculeDepositStatus;
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}
