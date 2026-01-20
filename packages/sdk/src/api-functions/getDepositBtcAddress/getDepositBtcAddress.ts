import { Address, pad } from 'viem';

import { getChainNameById } from '../../common/blockchain-identifier';
import {
  isSolanaChain,
  isStarknetChainId,
  isSuiChain,
  isValidChain,
} from '../../common/chains';
import {
  AddressKind,
  getSolanaTokenAddress,
  getStarknetTokenAddress,
  getSuiTokenAddress,
  Token,
} from '../../tokens/token-addresses';
import { getTokenContractInfo } from '../../tokens/tokens';
import { makeRequest } from './make-request';
import type {
  IGetDepositBtcAddressesParameters,
  IGetDepositBtcAddressParameters,
} from './types';

/**
 * Returns the current address for depositing BTC by given parameters.
 *
 * @throws {Error} - Throws an error if no address found or the provided chain id is not supported.
 */
export async function getDepositBtcAddress({
  address,
  chainId,
  env,
  partnerId,
  token: tokenParam = Token.LBTC,
}: IGetDepositBtcAddressParameters) {
  const _addresses = await makeRequest({
    address,
    chainId,
    env,
    partnerId,
  });

  let depositAddress: string | undefined = undefined;

  if (![Token.LBTC, Token.BTCK, Token.BTCb].includes(tokenParam)) {
    throw new Error('Unsupported token');
  }

  // Filter deposit addresses by the destination token
  let tokenAddressFilter:
    | { token_address: string; aux_version?: number }
    | undefined = undefined;
  try {
    if (isValidChain(chainId)) {
      const tokenContractInfo = await getTokenContractInfo(
        tokenParam,
        chainId,
        env,
        AddressKind.Adapter,
      );
      tokenAddressFilter = {
        token_address: tokenContractInfo.address.toLowerCase(),
      };
    }

    if (isSuiChain(chainId)) {
      const tokenAddress = getSuiTokenAddress(chainId, env);
      if (tokenAddress) {
        tokenAddressFilter = {
          token_address: tokenAddress.toLowerCase(),
        };
      }
    }

    if (isSolanaChain(chainId)) {
      const tokenAddress = getSolanaTokenAddress(chainId, env);
      if (tokenAddress) {
        tokenAddressFilter = {
          token_address: tokenAddress.toLowerCase(),
        };
      }
    }

    if (isStarknetChainId(chainId)) {
      // api returns the address of the asset router contract
      const tokenAddress = getStarknetTokenAddress(chainId, env, 'assetRouter');
      if (tokenAddress) {
        tokenAddressFilter = {
          token_address: tokenAddress.toLowerCase(),
        };
      }
    }
  } catch {
    // NOOP
  }

  if (isStarknetChainId(chainId)) {
    address = pad(address as Address, { size: 32 }).toLowerCase();
  }

  const addresses = (_addresses || [])
    .filter(
      a =>
        // filter by chain id
        a.deposit_metadata.to_blockchain.toLowerCase() ===
          getChainNameById(chainId).toLowerCase() &&
        // filter by address
        a.deposit_metadata.to_address.toLowerCase() === address.toLowerCase(),
    )
    .filter(a => {
      if (!tokenAddressFilter) {
        return false;
      }

      // check if token addresses are matched
      let isForToken =
        a.deposit_metadata.token_address?.toLowerCase() ===
        tokenAddressFilter.token_address;
      // check if aux version is matched (if provided)
      if (tokenAddressFilter.aux_version != null) {
        isForToken =
          isForToken &&
          a.deposit_metadata.aux_version === tokenAddressFilter.aux_version;
      }

      // token_address can also be empty (null) when the address is for LBTC.
      // nosemgrep: codacy.tools-configs.rules_lgpl_javascript_crypto_rule-node-timing-attack -- comparing Token enum values, not secrets
      if (tokenParam === Token.LBTC) {
        isForToken = isForToken || !a.deposit_metadata.token_address;
      }

      // Get only the addresses for the specified token.
      return isForToken;
    });

  if (addresses && addresses.length > 0) {
    const mostRecentAddress = addresses.reduce((mostRecent, cur) => {
      if (cur.created_at > mostRecent.created_at) {
        return cur;
      }
      return mostRecent;
    }, addresses[0]);

    if (!mostRecentAddress.deprecated) {
      depositAddress = mostRecentAddress.btc_address;
    }
  }

  if (!depositAddress) {
    throw new Error(
      `No deposit address found for ${address} on chain ${chainId}`,
    );
  }

  return depositAddress;
}

/**
 * Returns the addresses for depositing BTC by given parameters.
 * @throws {Error} - Throws an error if chain id is not supported.
 */
export async function getDepositBtcAddresses(
  parameters: IGetDepositBtcAddressesParameters,
) {
  const addresses = await makeRequest(parameters);
  return addresses;
}
