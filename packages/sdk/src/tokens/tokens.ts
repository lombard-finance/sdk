import { Env } from '@lombard.finance/sdk-common';
import { getLBTCContractInfo } from './lbtc-contract';
import { ChainId } from '../common/chains';
import { makePublicClient } from '../clients/public-client';
import BigNumber from 'bignumber.js';
import { Abi, Address, erc20Abi } from 'viem';

export type Token = 'LBTC';

export type TokenInfo = {
  address: Address;
  abi: Abi;
  symbol: string;
  decimals: number;
};

export function getTokenContractInfo(
  token: Token,
  chainId: ChainId,
  env?: Env,
) {
  if (token === 'LBTC') {
    return getLBTCContractInfo(chainId, env);
  }
}

export async function getTokenInfo(
  token: Token,
  chainId: ChainId,
  env?: Env,
  rpcUrl?: string,
): Promise<TokenInfo | undefined> {
  const tokenContractInfo = getTokenContractInfo(token, chainId, env);
  if (!tokenContractInfo) return;

  const publicClient = makePublicClient({ chainId, rpcUrl });
  const [symbolResult, decimalsResult] = await publicClient.multicall({
    contracts: [
      {
        ...tokenContractInfo,
        functionName: 'symbol',
      },
      {
        ...tokenContractInfo,
        functionName: 'decimals',
      },
    ],
  });

  if (
    symbolResult.status === 'success' &&
    decimalsResult.status === 'success'
  ) {
    return {
      address: tokenContractInfo.address,
      abi: tokenContractInfo.abi as Abi,
      symbol: String(symbolResult.result),
      decimals: Number(decimalsResult.result),
    };
  }
}

export function toBaseDenomination(
  input: BigNumber.Value,
  decimalPlaces: number,
) {
  return BigNumber(input)
    .multipliedBy(BigNumber(10).pow(decimalPlaces))
    .decimalPlaces(0, BigNumber.ROUND_HALF_UP);
}

export function fromBaseDenomination(
  input: BigNumber.Value,
  decimalPlaces: number,
) {
  return BigNumber(input).dividedBy(BigNumber(10).pow(decimalPlaces));
}

export async function getAssetInfo(
  address: Address,
  chainId: ChainId,
  rpcUrl?: string,
): Promise<TokenInfo | undefined> {
  const publicClient = makePublicClient({ chainId, rpcUrl });
  const [symbolResult, decimalsResult] = await publicClient.multicall({
    contracts: [
      {
        address,
        abi: erc20Abi,
        functionName: 'symbol',
      },
      {
        address,
        abi: erc20Abi,
        functionName: 'decimals',
      },
    ],
  });

  if (
    symbolResult.status === 'success' &&
    decimalsResult.status === 'success'
  ) {
    return {
      address,
      abi: erc20Abi,
      symbol: String(symbolResult.result),
      decimals: Number(decimalsResult.result),
    };
  }
}
