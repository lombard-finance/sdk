import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import { type Abi, Address, erc20Abi, PublicClient, zeroAddress } from 'viem';
import { TOKEN_ADDRESSES, Token } from './token-addresses';
import { LBTC_ABI } from './abi/LBTC_ABI';
import { TokenContractAddressNotFoundError } from '../utils/err';
import BTCK_ABI from './abi/BTCK_ABI';
import STLBTC_ABI from './abi/STLBTC_ABI';
import NATIVE_LBTC_ABI from './abi/NATIVE_LBTC_ABI';
import { ChainId } from '../common/chains';
import { makePublicClient } from '../clients/public-client';

export type TokenInfo = {
  address: Address;
  abi: Abi;
  symbol: string;
  decimals: number;
};

const MAYBE_UPGRADED_CONTRACT_ABI = [
  {
    inputs: [],
    name: 'getAssetRouter',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
const UPGRADED_CONTRACT_POINTER = MAYBE_UPGRADED_CONTRACT_ABI[0].name;

export async function isUpgradedContract(
  token: Token.LBTC | Token.BTCK,
  chainId: ChainId,
  env?: Env,
  rpcUrl?: string,
) {
  const environment = env || DEFAULT_ENV;
  const address = TOKEN_ADDRESSES[token]?.[environment]?.[chainId];
  if (!address) {
    throw new TokenContractAddressNotFoundError(token, chainId, environment);
  }

  const publicClient = makePublicClient({ chainId, rpcUrl, env: environment });
  try {
    const assetRouter = await publicClient.readContract({
      abi: MAYBE_UPGRADED_CONTRACT_ABI,
      address,
      functionName: UPGRADED_CONTRACT_POINTER,
    });
    return assetRouter !== zeroAddress;
  } catch (_err) {
    return false;
  }
}

type AbiForLBTC =
  | typeof STLBTC_ABI // upgraded
  | typeof LBTC_ABI; // legacy

type AbiForBTCK =
  | typeof NATIVE_LBTC_ABI // upgraded
  | typeof BTCK_ABI; // legacy

type AbiForNativeLBTC = typeof NATIVE_LBTC_ABI;

type AbiFor<TToken extends Token> = TToken extends Token.LBTC
  ? AbiForLBTC
  : TToken extends Token.BTCK
    ? AbiForBTCK
    : TToken extends Token.NativeLBTC
      ? AbiForNativeLBTC
      : typeof erc20Abi;

type TokenContractInfo<TToken extends Token> = {
  abi: AbiFor<TToken>;
  address: Address;
  chainId: ChainId;
};

export const isUpgradedAbi = (
  abi: Abi,
): abi is typeof STLBTC_ABI | typeof NATIVE_LBTC_ABI => {
  const redeemForBtcAbi = abi.find(
    a => a.type === 'function' && a.name === UPGRADED_CONTRACT_POINTER,
  );
  return redeemForBtcAbi != null;
};

export async function getTokenContractInfo<TToken extends Token>(
  token: TToken,
  chainId: ChainId,
  env?: Env,
): Promise<TokenContractInfo<TToken>> {
  const environment = env || DEFAULT_ENV;

  let abi: AbiFor<TToken> | undefined = undefined;
  if (token === Token.LBTC) {
    if (await isUpgradedContract(Token.LBTC, chainId, environment)) {
      abi = STLBTC_ABI as AbiFor<TToken>;
    } else {
      abi = LBTC_ABI as AbiFor<TToken>;
    }
  } else if (token === Token.BTCK) {
    abi = BTCK_ABI as AbiFor<TToken>;
    if (await isUpgradedContract(Token.BTCK, chainId, environment)) {
      abi = NATIVE_LBTC_ABI as AbiFor<TToken>;
    }
  } else if (token === Token.NativeLBTC) {
    abi = NATIVE_LBTC_ABI as AbiFor<TToken>;
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
  const tokenContractInfo = await getTokenContractInfo(token, chainId, env);
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
