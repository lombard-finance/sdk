import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import {
  Address,
  ByteArray,
  Client,
  getContract,
  keccak256,
  PublicClient,
  zeroAddress,
} from 'viem';

import { Deposit } from '../../api-functions/getDepositsByAddress/getDepositsByAddress';
import { makePublicClient } from '../../clients/public-client';
import { makeWalletClient } from '../../clients/wallet-client';
import {
  isEthereumChain,
  isKatanaChain,
  isMonadChain,
} from '../../common/chains';
import { CommonOptionalWriteParameters } from '../../common/parameters';
import ASSET_ROUTER_ABI from '../../tokens/abi/ASSET_ROUTER_ABI';
import KATANA_BASCULE_ABI from '../../tokens/abi/KATANA_BASCULE_ABI';
import LBTC_BASCULE_ABI from '../../tokens/abi/LBTC_BASCULE_ABI.json';
import { AddressKind, Token } from '../../tokens/token-addresses';
import { getTokenContractInfo, isUpgradedAbi } from '../../tokens/tokens';
import { getErrorMessage } from '../../utils/err';
import {
  calcMintIDFromDecoded,
  decodeGmpMintPayload,
} from './decodeBasculeDepositStatus';

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
  deposit?: Deposit;
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
 *
 * **Multiple Bascule Interfaces:**
 * This function supports two different bascule contract interfaces:
 * - **Asset Router (upgraded)**: Uses `bascule()` getter - for StakedLBTC and upgraded contracts
 * - **Bridge Token Adapter**: Uses `getBascule()` getter - for BTCb on Avalanche
 * - **Legacy NativeLBTC**: Uses `Bascule()` getter - for old LBTC contracts
 *
 * **MintID Calculation:**
 * For Katana chains, this function uses proper GMP payload decoding to calculate
 * the mintID, which matches the Solidity implementation. For other chains, it uses
 * a simplified method.
 *
 * @param {IGetBasculeDepositStatusParameters} parameters - The parameters.
 * @param {Deposit} parameters.deposit - The deposit for which the bascule status will be checked. You can omit `rawPayload` parameter if `deposit` is provided.
 * @param {string} parameters.rawPayload - The `rawPayload` of the deposit for which the bascule status will be checked. You can omit `deposit` parameter if `rawPayload` is provided.
 * @param {ChainId} parameters.chainId - The chain id. For Katana chains (Katana mainnet or Katana Tatara testnet), GMP payload decoding is used.
 * @param {Token} parameters.token - The token for which to check bascule status. Defaults to Token.LBTC.
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
  const tokenContractInfo = await getTokenContractInfo(
    token,
    chainId,
    env,
    AddressKind.Adapter,
  );

  // Determine which bascule getter function to use based on the contract type
  // There are two different approaches:
  // 1. Upgraded contracts (Asset Router): token.getAssetRouter() -> assetRouter.bascule()
  // 2. Legacy contracts (NativeLBTC): Bascule()

  let basculeContractAddress: Address;

  if (isUpgradedAbi(tokenContractInfo.abi)) {
    // Upgraded contract - get bascule from Asset Router
    const assetRouterAddress = (await publicClient.readContract({
      abi: tokenContractInfo.abi,
      address: tokenContractInfo.address,
      functionName: 'getAssetRouter',
    })) as Address;

    basculeContractAddress = (await publicClient.readContract({
      abi: ASSET_ROUTER_ABI,
      address: assetRouterAddress,
      functionName: 'bascule',
    })) as Address;
  } else {
    basculeContractAddress = (await publicClient.readContract({
      abi: tokenContractInfo.abi,
      address: tokenContractInfo.address,
      functionName: 'Bascule',
    })) as Address;
  }

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
    // For Katana chains, use proper GMP payload decoding to calculate mintID
    if (
      isKatanaChain(chainId) ||
      isMonadChain(chainId) ||
      isEthereumChain(chainId)
    ) {
      const prefixedPayload = payload.startsWith('0x')
        ? payload
        : `0x${payload}`;
      const decoded = decodeGmpMintPayload(prefixedPayload);
      const mintId = calcMintIDFromDecoded(decoded, chainId);

      const [, status] = (await publicClient.readContract({
        abi: KATANA_BASCULE_ABI,
        address: basculeContractAddress,
        functionName: 'mintHistory',
        args: [mintId],
      })) as [unknown, BasculeDepositStatus];

      return status;
    }

    // For non-Katana chains, use the simple method
    const basculeDepositId = keccak256(
      Buffer.from(payload.slice(8), 'hex') as unknown as ByteArray,
    );

    const basculeContract = getContract({
      abi: LBTC_BASCULE_ABI,
      address: basculeContractAddress,
      client: publicClient,
    });

    const status = await basculeContract.read.depositHistory([
      basculeDepositId,
    ]);
    return status as BasculeDepositStatus;
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}
