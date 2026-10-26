import {
  type Address,
  BaseError,
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
  parseAbi,
} from 'viem';

import { makePublicClient } from '../../clients/public-client';
import type { CommonParameters } from '../../common/parameters';

export interface TokenEip712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: Address;
}

export interface GetTokenEip712DomainParameters extends CommonParameters {
  tokenAddress: Address;
}

const domainAbi = parseAbi([
  'function eip712Domain() view returns (bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)',
  'function name() view returns (string)',
]);

const inFlightDomains = new Map<string, Promise<TokenEip712Domain>>();

async function readDomain({
  tokenAddress,
  ...parameters
}: GetTokenEip712DomainParameters): Promise<TokenEip712Domain> {
  const client = makePublicClient(parameters);
  let result;
  try {
    result = await client.readContract({
      address: tokenAddress,
      abi: domainAbi,
      functionName: 'eip712Domain',
    });
  } catch (error) {
    const unavailable =
      error instanceof BaseError &&
      error.walk(
        (cause) =>
          cause instanceof ContractFunctionRevertedError ||
          cause instanceof ContractFunctionZeroDataError,
      );
    if (
      !(unavailable instanceof ContractFunctionRevertedError) &&
      !(unavailable instanceof ContractFunctionZeroDataError)
    ) {
      throw error;
    }
    return {
      name: await client.readContract({
        address: tokenAddress,
        abi: domainAbi,
        functionName: 'name',
      }),
      version: '1',
      chainId: parameters.chainId,
      verifyingContract: tokenAddress,
    };
  }

  const [fields, name, version, chainId, verifyingContract, , extensions] =
    result;
  if (fields !== '0x0f' || extensions.length > 0) {
    throw new Error(`Unsupported EIP-712 domain for ${tokenAddress}`);
  }
  if (
    chainId !== BigInt(parameters.chainId) ||
    verifyingContract.toLowerCase() !== tokenAddress.toLowerCase()
  ) {
    throw new Error(
      `EIP-712 domain does not match chain/token for ${tokenAddress}`,
    );
  }
  return { name, version, chainId: Number(chainId), verifyingContract };
}

/** Reads the token domain, sharing only in-flight requests for the same chain and address. */
export async function getTokenEip712Domain(
  parameters: GetTokenEip712DomainParameters,
): Promise<TokenEip712Domain> {
  const key = `${parameters.chainId}:${parameters.tokenAddress.toLowerCase()}`;
  let domain = inFlightDomains.get(key);
  if (!domain) {
    domain = readDomain(parameters).finally(() => {
      inFlightDomains.delete(key);
    });
    inFlightDomains.set(key, domain);
  }
  return { ...(await domain) };
}
