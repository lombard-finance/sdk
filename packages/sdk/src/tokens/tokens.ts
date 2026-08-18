/**
 * Token Contract Utilities
 *
 * @deprecated v4.1 Migration Target
 *
 * Functions like `getTokenContractInfo()` use hardcoded TOKEN_ADDRESSES.
 * For v4.1, migrate to use Asset Catalog with catalog injection.
 *
 * See: docs/ADDRESS_SYSTEM_UNIFICATION.md
 *
 * @module tokens/tokens
 */

import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import { type Abi, Address, erc20Abi, PublicClient, zeroAddress } from 'viem';

import { makePublicClient } from '../clients/public-client';
import { ChainId } from '../common/chains';
import { TokenContractAddressNotFoundError } from '../utils/err';
import BRIDGE_TOKEN_ADAPTER_ABI from './abi/BRIDGE_TOKEN_ADAPTER_ABI';
import BTCK_ABI from './abi/BTCK_ABI';
import { LBTC_ABI } from './abi/LBTC_ABI';
import NATIVE_LBTC_ABI from './abi/NATIVE_LBTC_ABI';
import STLBTC_ABI from './abi/STLBTC_ABI';
import { AddressKind, Token, TOKEN_ADDRESSES } from './token-addresses';

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
      address: typeof address === 'string' ? address : address.adapter,
      functionName: UPGRADED_CONTRACT_POINTER,
    });
    return assetRouter !== zeroAddress;
  } catch {
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
export type AbiForBridgeTokenAdapter = typeof BRIDGE_TOKEN_ADAPTER_ABI;

type AbiFor<
  TToken extends Token,
  chain = ChainId,
  addressKind extends AddressKind = AddressKind.Token,
> = TToken extends Token.LBTC
  ? AbiForLBTC
  : TToken extends Token.BTCK
    ? AbiForBTCK
    : TToken extends Token.BTCb
      ? chain extends typeof ChainId.avalanche | typeof ChainId.avalancheFuji
        ? addressKind extends AddressKind.Adapter
          ? AbiForBridgeTokenAdapter
          : typeof erc20Abi // <-- AddressKind.Token - ERC-20 Token Contract
        : AbiForNativeLBTC
      : typeof erc20Abi;

type TokenContractInfo<
  TToken extends Token,
  chain extends ChainId,
  TAddressKind extends AddressKind,
> = {
  abi: AbiFor<TToken, chain, TAddressKind>;
  address: Address;
  chainId: chain;
};

export const isUpgradedAbi = (
  abi: unknown,
): abi is typeof STLBTC_ABI | typeof NATIVE_LBTC_ABI => {
  const redeemForBtcAbi = (abi as Abi).find(
    (a) => a.type === 'function' && a.name === UPGRADED_CONTRACT_POINTER,
  );
  return redeemForBtcAbi != null;
};

export async function getTokenContractInfo<
  TToken extends Token,
  chain extends ChainId,
  TAddressKind extends AddressKind = AddressKind.Token,
>(
  token: TToken,
  chainId: chain,
  env?: Env,
  _addressKind?: TAddressKind,
  rpcUrl?: string,
): Promise<TokenContractInfo<TToken, chain, TAddressKind>> {
  const environment = env || DEFAULT_ENV;
  const addressKind = _addressKind || AddressKind.Token;

  let abi: AbiFor<TToken, chain, TAddressKind> | undefined = undefined;

  // nosemgrep: codacy.tools-configs.rules_lgpl_javascript_crypto_rule-node-timing-attack -- comparing Token enum values, not secrets
  if (token === Token.LBTC) {
    if (await isUpgradedContract(Token.LBTC, chainId, environment, rpcUrl)) {
      abi = STLBTC_ABI as AbiFor<TToken, chain, TAddressKind>;
    } else {
      abi = LBTC_ABI as AbiFor<TToken, chain, TAddressKind>;
    }
  } else if (token === Token.BTCK) {
    abi = BTCK_ABI as AbiFor<TToken, chain, TAddressKind>;
    if (await isUpgradedContract(Token.BTCK, chainId, environment, rpcUrl)) {
      abi = NATIVE_LBTC_ABI as AbiFor<TToken, chain, TAddressKind>;
    }
  } else if (token === Token.BTCb) {
    if (chainId === ChainId.avalanche || chainId === ChainId.avalancheFuji) {
      if (addressKind === AddressKind.Adapter) {
        abi = BRIDGE_TOKEN_ADAPTER_ABI as AbiFor<TToken, chain, TAddressKind>;
      } else {
        abi = erc20Abi as AbiFor<TToken, chain, TAddressKind>;
      }
    } else {
      abi = NATIVE_LBTC_ABI as AbiFor<TToken, chain, TAddressKind>;
    }
  } else {
    abi = erc20Abi as AbiFor<TToken, chain, TAddressKind>;
  }

  const address = TOKEN_ADDRESSES[token]?.[environment]?.[chainId];
  if (!address) {
    throw new TokenContractAddressNotFoundError(token, chainId, environment);
  }

  return {
    abi,
    address: typeof address === 'string' ? address : address[addressKind],
    chainId,
  };
}

export const retrieveTokenProperties = async <
  TToken extends Token,
  chain extends ChainId,
>(
  publicClient: PublicClient,
  tokenContractInfo: TokenContractInfo<TToken, chain, AddressKind.Token>,
) => {
  const [symbolResult, decimalsResult] = await publicClient.multicall({
    contracts: [
      {
        address: tokenContractInfo.address,
        abi: tokenContractInfo.abi as Abi,
        functionName: 'symbol',
      },
      {
        address: tokenContractInfo.address,
        abi: tokenContractInfo.abi as Abi,
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
      abi: tokenContractInfo.abi,
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
) {
  const tokenContractInfo = await getTokenContractInfo(
    token,
    chainId,
    env,
    undefined,
    rpcUrl,
  );
  if (!tokenContractInfo) return;

  const publicClient = makePublicClient({ chainId, rpcUrl, env });
  return retrieveTokenProperties(publicClient, tokenContractInfo);
}

export async function getAssetInfo(
  address: Address,
  chainId: ChainId,
  rpcUrl?: string,
  env?: Env,
) {
  const publicClient = makePublicClient({ chainId, rpcUrl, env });
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
