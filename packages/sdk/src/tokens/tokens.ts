import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import { Abi, Address, PublicClient, erc20Abi } from 'viem';
import { makePublicClient } from '../clients/public-client';
import { ChainId } from '../common/chains';
import { TokenContractAddressNotFoundError } from '../utils/err';
import BTCK_ABI from './abi/BTCK_ABI';
import { LBTC_ABI } from './abi/LBTC_ABI';
import NATIVE_LBTC_ABI from './abi/NATIVE_LBTC_ABI';
import STLBTC_ABI from './abi/STLBTC_ABI';
import {
  STLBTC_CHAINS,
  STLBTC_ENVS,
  TOKEN_ADDRESSES,
  Token,
} from './token-addresses';

export type TokenInfo = {
  address: Address;
  abi: Abi;
  symbol: string;
  decimals: number;
};

type AbiFor<
  TToken extends Token,
  TChainId = ChainId,
> = TToken extends Token.LBTC
  ? TChainId extends typeof ChainId.sepolia // FIXME: Remove chain clause when all updated
    ? typeof STLBTC_ABI
    : typeof LBTC_ABI
  : TToken extends Token.BTCK
    ? typeof BTCK_ABI
    : TToken extends Token.NativeLBTC
      ? typeof NATIVE_LBTC_ABI
      : typeof erc20Abi;

type TokenContractInfo<TToken extends Token, TChainId = ChainId> = {
  abi: AbiFor<TToken, TChainId>;
  address: Address;
  chainId: TChainId;
};

export const isSTLBTCAbi = (abi: Abi): abi is typeof STLBTC_ABI => {
  const redeemForBtcAbi = abi.find(
    a => a.type === 'function' && a.name === 'redeemForBtc',
  );
  return redeemForBtcAbi != null;
};

export function getTokenContractInfo<
  TToken extends Token,
  TChainId extends ChainId,
>(
  token: TToken,
  chainId: TChainId,
  env?: Env,
): TokenContractInfo<TToken, TChainId> {
  const environment = env || DEFAULT_ENV;

  let abi: AbiFor<TToken, TChainId> | undefined = undefined;
  if (token === Token.LBTC) {
    if (STLBTC_CHAINS.includes(chainId) && STLBTC_ENVS.includes(environment)) {
      abi = STLBTC_ABI as AbiFor<TToken, TChainId>;
    } else {
      abi = LBTC_ABI as AbiFor<TToken, TChainId>;
    }
  } else if (token === Token.BTCK) {
    abi = BTCK_ABI as AbiFor<TToken, TChainId>;
  } else if (token === Token.NativeLBTC) {
    abi = NATIVE_LBTC_ABI as AbiFor<TToken>;
  } else {
    abi = erc20Abi as AbiFor<TToken, TChainId>;
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
