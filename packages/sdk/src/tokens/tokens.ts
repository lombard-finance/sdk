import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import { ChainId } from '../common/chains';
import { makePublicClient } from '../clients/public-client';
import BigNumber from 'bignumber.js';
import { Abi, Address, erc20Abi, PublicClient } from 'viem';
import { TOKEN_ADDRESSES, Token } from './token-addresses';
import { LBTC_ABI } from './abi/LBTC_ABI';
import { TokenContractAddressNotFoundError } from '../utils/err';
import BTCK_ABI from './abi/BTCK_ABI';

export type TokenInfo = {
  address: Address;
  abi: Abi;
  symbol: string;
  decimals: number;
};

type AbiFor<TToken extends Token> = TToken extends Token.LBTC
  ? typeof LBTC_ABI
  : TToken extends Token.BTCK
    ? typeof BTCK_ABI
    : typeof erc20Abi;

type TokenContractInfo<TToken extends Token> = {
  abi: AbiFor<TToken>;
  address: Address;
  chainId: ChainId;
};

export function getTokenContractInfo<TToken extends Token>(
  token: TToken,
  chainId: ChainId,
  env?: Env,
): TokenContractInfo<TToken> {
  const environment = env || DEFAULT_ENV;

  let abi: AbiFor<TToken> | undefined = undefined;
  if (token === Token.LBTC) {
    abi = LBTC_ABI as AbiFor<TToken>;
  } else if (token === Token.BTCK) {
    abi = BTCK_ABI as AbiFor<TToken>;
  } else {
    abi = erc20Abi as AbiFor<TToken>;
  }

  const address = TOKEN_ADDRESSES[token]?.[environment]?.[chainId];
  if (!address) {
    throw new TokenContractAddressNotFoundError(token, chainId, environment);
  }

  return {
    abi,
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
