import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import {
  Address,
  ByteArray,
  Client,
  decodeFunctionResult,
  encodeFunctionData,
  getContract,
  Hex,
  keccak256,
  PublicClient,
  size,
  zeroAddress,
} from 'viem';

import { Deposit } from '../../api-functions/getDepositsByAddress/getDepositsByAddress';
import { makePublicClient } from '../../clients/public-client';
import { makeWalletClient } from '../../clients/wallet-client';
import { ChainId } from '../../common/chains';
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
  isGmpMintPayload,
} from './decodeBasculeDepositStatus';

// GMPBasculeV2 (Base, BSC, Sonic) returns only the MintState from
// `mintHistory`, while GMPBasculeV1 returns the stored message with it.
const GMP_BASCULE_V2_MINT_HISTORY_ABI = [
  {
    inputs: [{ internalType: 'bytes32', name: 'mintID', type: 'bytes32' }],
    name: 'mintHistory',
    outputs: [
      {
        internalType: 'enum GMPBasculeV2.MintState',
        name: '',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const GMP_BASCULE_V2_MINT_HISTORY_SIZE = 32;

/**
 * Thrown when a deposit notarized with a legacy (pre-GMP) payload is checked
 * against an Asset Router Bascule. Those deposits can no longer be minted on
 * that chain.
 */
export class LegacyPayloadNotClaimableError extends Error {
  constructor() {
    super(
      'This deposit was notarized with a legacy payload and can no longer be claimed on this chain.',
    );
    this.name = 'LegacyPayloadNotClaimableError';
  }
}

async function readGmpMintStatus(
  publicClient: PublicClient,
  basculeContractAddress: Address,
  mintId: Hex,
): Promise<BasculeDepositStatus> {
  const { data } = await publicClient.call({
    to: basculeContractAddress,
    data: encodeFunctionData({
      abi: GMP_BASCULE_V2_MINT_HISTORY_ABI,
      functionName: 'mintHistory',
      args: [mintId],
    }),
  });

  if (!data || data === '0x') {
    throw new Error('mintHistory returned no data');
  }

  if (size(data) === GMP_BASCULE_V2_MINT_HISTORY_SIZE) {
    return decodeFunctionResult({
      abi: GMP_BASCULE_V2_MINT_HISTORY_ABI,
      functionName: 'mintHistory',
      data,
    }) as BasculeDepositStatus;
  }

  const [, status] = decodeFunctionResult({
    abi: KATANA_BASCULE_ABI,
    functionName: 'mintHistory',
    data,
  }) as [unknown, BasculeDepositStatus];

  return status;
}

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

export interface IGetBasculeDepositStatusParameters extends CommonOptionalWriteParameters {
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
 * When the Bascule comes from the Asset Router (a GMPBascule), the GMP payload is
 * decoded to calculate the mintID, matching the Solidity implementation, and the
 * status is read from `mintHistory`. Both GMPBasculeV1 (message + status) and
 * GMPBasculeV2 (status only) return shapes are supported. Legacy Bascules use the
 * payload hash with `depositHistory`.
 *
 * @throws {LegacyPayloadNotClaimableError} When a legacy payload is checked
 * against a GMPBascule; such deposits can no longer be minted on that chain.
 *
 * @param {IGetBasculeDepositStatusParameters} parameters - The parameters.
 * @param {Deposit} parameters.deposit - The deposit for which the bascule status will be checked. You can omit `rawPayload` parameter if `deposit` is provided.
 * @param {string} parameters.rawPayload - The `rawPayload` of the deposit for which the bascule status will be checked. You can omit `deposit` parameter if `rawPayload` is provided.
 * @param {ChainId} parameters.chainId - The chain id.
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
  // There are three different approaches:
  // 1. Upgraded contracts (Asset Router): token.getAssetRouter() -> assetRouter.bascule()
  // 2. Bridge Token Adapter (BTCb on Avalanche): getBascule()
  // 3. Legacy contracts (NativeLBTC): Bascule()

  let basculeContractAddress: Address;
  // An Asset Router Bascule is a GMPBascule: it tracks mints by mintID through
  // `mintHistory` and reverts on the legacy `depositHistory`.
  let isGmpBascule = false;

  if (
    token === Token.BTCb &&
    (chainId === ChainId.avalanche || chainId === ChainId.avalancheFuji)
  ) {
    basculeContractAddress = (await publicClient.readContract({
      abi: tokenContractInfo.abi,
      address: tokenContractInfo.address,
      functionName: 'getBascule',
    })) as Address;
  } else if (isUpgradedAbi(tokenContractInfo.abi) && token === Token.LBTC) {
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
    isGmpBascule = true;
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
    if (isGmpBascule) {
      const prefixedPayload = payload.startsWith('0x')
        ? payload
        : `0x${payload}`;

      if (!isGmpMintPayload(prefixedPayload)) {
        throw new LegacyPayloadNotClaimableError();
      }

      const decoded = decodeGmpMintPayload(prefixedPayload);
      const mintId = calcMintIDFromDecoded(decoded, chainId) as Hex;

      return await readGmpMintStatus(
        publicClient,
        basculeContractAddress,
        mintId,
      );
    }

    // Legacy Bascule: deposits are tracked by the payload hash
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
    if (err instanceof LegacyPayloadNotClaimableError) {
      throw err;
    }
    throw new Error(getErrorMessage(err));
  }
}
