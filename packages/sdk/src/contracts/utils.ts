/**
 * Contract utility functions for the Lombard SDK.
 *
 * These utilities help determine which ABI to use for a given contract,
 * handle contract upgrades, and provide typed contract information.
 */

import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import { type Abi, erc20Abi, zeroAddress } from 'viem';

import { makePublicClient } from '../clients/public-client';
import { ChainId } from '../common/chains';
import {
  AssetId,
  evmChainIdToChain,
  getAssetAddress,
  getBridgeAdapter,
} from '../core';
import {
  ASSET_ROUTER_ABI,
  BRIDGE_TOKEN_ADAPTER_ABI,
  BTCK_ABI,
  LBTC_ABI,
  NATIVE_LBTC_ABI,
  STLBTC_ABI,
} from './abis';
import {
  AddressKind,
  type ContractInfo,
  ContractType,
  ContractVersion,
  type GetContractInfoOptions,
} from './types';

/**
 * ABI fragment for detecting upgraded contracts.
 * Upgraded contracts have a `getAssetRouter` function.
 */
const UPGRADE_DETECTION_ABI = [
  {
    inputs: [],
    name: 'getAssetRouter',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Checks if a contract has been upgraded to support AssetRouter.
 *
 * Upgraded contracts have a `getAssetRouter()` function that returns
 * a non-zero address when the AssetRouter is configured.
 *
 * @param address - Contract address to check
 * @param chainId - Chain ID
 * @param env - Environment (default: DEFAULT_ENV)
 * @param rpcUrl - Optional custom RPC URL
 * @returns true if contract is upgraded, false otherwise
 */
export async function isUpgradedContract(
  address: `0x${string}`,
  chainId: ChainId,
  env: Env = DEFAULT_ENV,
  rpcUrl?: string,
): Promise<boolean> {
  const publicClient = makePublicClient({ chainId, rpcUrl, env });

  try {
    const assetRouter = await publicClient.readContract({
      abi: UPGRADE_DETECTION_ABI,
      address,
      functionName: 'getAssetRouter',
    });
    return assetRouter !== zeroAddress;
  } catch {
    // Contract doesn't have getAssetRouter function = not upgraded
    return false;
  }
}

/**
 * Type guard to check if an ABI is an upgraded contract ABI.
 */
export function isUpgradedAbi(
  abi: unknown,
): abi is typeof STLBTC_ABI | typeof NATIVE_LBTC_ABI {
  const hasAssetRouter = (abi as Abi).find(
    a => a.type === 'function' && a.name === 'getAssetRouter',
  );
  return hasAssetRouter != null;
}

/**
 * Gets the appropriate ABI for an LBTC contract based on upgrade status.
 *
 * @param address - Contract address
 * @param chainId - Chain ID
 * @param env - Environment
 * @param rpcUrl - Optional custom RPC URL
 * @returns The appropriate ABI and version
 */
export async function getLbtcAbi(
  address: `0x${string}`,
  chainId: ChainId,
  env: Env = DEFAULT_ENV,
  rpcUrl?: string,
): Promise<{
  abi: typeof LBTC_ABI | typeof STLBTC_ABI;
  version: ContractVersion;
}> {
  const upgraded = await isUpgradedContract(address, chainId, env, rpcUrl);
  return {
    abi: upgraded ? STLBTC_ABI : LBTC_ABI,
    version: upgraded ? ContractVersion.Upgraded : ContractVersion.Legacy,
  };
}

/**
 * Gets the appropriate ABI for a BTCK contract based on upgrade status.
 *
 * @param address - Contract address
 * @param chainId - Chain ID
 * @param env - Environment
 * @param rpcUrl - Optional custom RPC URL
 * @returns The appropriate ABI and version
 */
export async function getBtckAbi(
  address: `0x${string}`,
  chainId: ChainId,
  env: Env = DEFAULT_ENV,
  rpcUrl?: string,
): Promise<{
  abi: typeof BTCK_ABI | typeof NATIVE_LBTC_ABI;
  version: ContractVersion;
}> {
  const upgraded = await isUpgradedContract(address, chainId, env, rpcUrl);
  return {
    abi: upgraded ? NATIVE_LBTC_ABI : BTCK_ABI,
    version: upgraded ? ContractVersion.Upgraded : ContractVersion.Legacy,
  };
}

/**
 * Determines the contract type for an asset on a specific chain.
 *
 * @param assetId - Asset identifier
 * @param chainId - Chain ID
 * @param addressKind - Which address to use for dual-address tokens
 * @returns Contract type
 */
export function getContractType(
  assetId: AssetId,
  chainId: ChainId,
  addressKind: AddressKind = AddressKind.Token,
): ContractType {
  switch (assetId) {
    case AssetId.LBTC:
      return ContractType.LBTC;

    case AssetId.BTCK:
      return ContractType.BTCK;

    case AssetId.BTCb:
      // On Avalanche chains, BTCb uses dual-contract architecture
      if (chainId === ChainId.avalanche || chainId === ChainId.avalancheFuji) {
        return addressKind === AddressKind.Adapter
          ? ContractType.BridgeTokenAdapter
          : ContractType.ERC20;
      }
      // On other chains, BTCb is NativeLBTC
      return ContractType.NativeLBTC;

    default:
      // Supporting tokens (cbBTC, wBTC, etc.) use standard ERC20
      return ContractType.ERC20;
  }
}

/**
 * Gets contract information including ABI and address for an asset.
 *
 * This is the main entry point for getting everything needed to interact
 * with a contract. It handles:
 * - Determining the correct contract type
 * - Detecting contract upgrades
 * - Returning the appropriate ABI
 *
 * @param assetId - Asset identifier
 * @param chainId - Chain ID
 * @param env - Environment (default: DEFAULT_ENV)
 * @param options - Additional options
 * @returns Contract information including ABI and address
 *
 * @example
 * ```typescript
 * // Get LBTC contract info
 * const info = await getContractInfo(AssetId.LBTC, ChainId.ethereum, Env.prod);
 * const contract = getContract({ ...info, client });
 * const balance = await contract.read.balanceOf([userAddress]);
 *
 * // Get BTCb adapter on Avalanche
 * const adapterInfo = await getContractInfo(
 *   AssetId.BTCb,
 *   ChainId.avalanche,
 *   Env.prod,
 *   { addressKind: AddressKind.Adapter }
 * );
 * ```
 */
export async function getContractInfo(
  assetId: AssetId,
  chainId: ChainId,
  env: Env = DEFAULT_ENV,
  options: GetContractInfoOptions = {},
): Promise<ContractInfo> {
  const { addressKind = AddressKind.Token, rpcUrl } = options;

  // Get address from the asset catalog
  // For Adapter kind, use getBridgeAdapter; otherwise use getAssetAddress
  // Convert ChainId (numeric) to Chain (CAIP-2 string like "eip155:1")
  const chain = evmChainIdToChain(chainId);
  const addressStr =
    addressKind === AddressKind.Adapter
      ? getBridgeAdapter(assetId, env, chain)
      : getAssetAddress(assetId, env, chain);

  if (!addressStr) {
    throw new Error(
      `No address found for ${assetId} on chain ${chainId} in ${env} environment (addressKind: ${addressKind})`,
    );
  }

  // Cast to 0x-prefixed address type
  const address = addressStr as `0x${string}`;

  const contractType = getContractType(assetId, chainId, addressKind);

  // Determine ABI based on contract type and upgrade status
  let abi: Abi;
  let version: ContractVersion | undefined;

  switch (contractType) {
    case ContractType.LBTC: {
      const result = await getLbtcAbi(address, chainId, env, rpcUrl);
      abi = result.abi as Abi;
      version = result.version;
      break;
    }

    case ContractType.BTCK: {
      const result = await getBtckAbi(address, chainId, env, rpcUrl);
      abi = result.abi as Abi;
      version = result.version;
      break;
    }

    case ContractType.NativeLBTC:
      abi = NATIVE_LBTC_ABI as Abi;
      break;

    case ContractType.BridgeTokenAdapter:
      abi = BRIDGE_TOKEN_ADAPTER_ABI as Abi;
      break;
    default:
      abi = erc20Abi;
      break;
  }

  return {
    abi: abi as ContractInfo['abi'],
    address,
    chainId,
    type: contractType,
    version,
  };
}

/**
 * Gets the ABI for an Asset Router contract.
 * Asset Router handles minting/redemption in the MARS architecture.
 *
 * @param assetId - Asset identifier (to get the associated router)
 * @param chainId - Chain ID
 * @param env - Environment
 * @returns Asset Router ABI
 */
export { ASSET_ROUTER_ABI };
