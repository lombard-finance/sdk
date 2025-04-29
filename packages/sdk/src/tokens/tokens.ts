import { Env } from '@lombard.finance/sdk-common';
import { ChainId } from '../common/chains';
import { makePublicClient } from '../clients/public-client';
import BigNumber from 'bignumber.js';
import { Abi, Address, erc20Abi, PublicClient } from 'viem';
import { TOKEN_ADDRESSES, Token } from './token-addresses';
import { getLbtcContractAddresses } from './lbtc-addresses';
import { LBTC_ABI } from './abi/LBTC_ABI';

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
  if (token === Token.LBTC) {
    const addresses = getLbtcContractAddresses(env);
    const contractAddress = addresses[chainId];
    if (!contractAddress) {
      throw new Error(
        `Could not determine the LBTC contract address for given chain id: ${chainId} (env: ${env})`,
      );
    }
    return { abi: LBTC_ABI, address: contractAddress, chainId };
  }

  const address = TOKEN_ADDRESSES[token]?.[chainId];
  if (!address) {
    throw new Error(
      `Could not determine the ${token} contract address for given chain id: ${chainId}`,
    );
  }

  return {
    abi: erc20Abi,
    address,
    chainId,
  };
}

export const retrieveTokenProperties = async (
  publicClient: PublicClient,
  tokenContractInfo: { abi: Abi; address: Address; chainId: ChainId },
) => {
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
};

export async function getTokenInfo(
  token: Token,
  chainId: ChainId,
  env?: Env,
  rpcUrl?: string,
): Promise<TokenInfo | undefined> {
  const tokenContractInfo = getTokenContractInfo(token, chainId, env);
  if (!tokenContractInfo) return;

  const publicClient = makePublicClient({ chainId, rpcUrl });
  return retrieveTokenProperties(publicClient, tokenContractInfo);
}

export async function getAssetInfo(
  address: Address,
  chainId: ChainId,
  rpcUrl?: string,
): Promise<TokenInfo | undefined> {
  const publicClient = makePublicClient({ chainId, rpcUrl });
  return retrieveTokenProperties(publicClient, {
    abi: erc20Abi,
    address,
    chainId,
  });
}

// Utils:
// TODO: Move to utils

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
