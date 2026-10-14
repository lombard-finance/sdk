import { DEFAULT_ENV } from '@lombard.finance/sdk-common';
import { Address, parseAbi } from 'viem';

import { makePublicClient } from '../../clients/public-client';
import { CommonParameters } from '../../common/parameters';
import { AddressKind, Token } from '../../tokens/token-addresses';
import { getTokenContractInfo } from '../../tokens/tokens';
import { determineEnv } from '../../utils/env';

/**
 * `nonces(owner)` alone. Some token ABIs in the catalog (plain ERC-20 on a few
 * chains) do not list it, so the read does not depend on the catalog ABI.
 */
const NONCES_ABI = parseAbi([
  'function nonces(address owner) view returns (uint256)',
]);

/** Tokens whose EIP-2612 nonce this function can read. */
export type PermitNonceToken = Token.LBTC | Token.BTCb;

export interface IGetPermitNonceParams extends CommonParameters {
  /**
   * Owner address to check permit nonce for
   */
  owner: Address;
  /**
   * The token whose `nonces(owner)` is read. Defaults to LBTC.
   */
  token?: PermitNonceToken;
}

/**
 * Get the EIP-2612 permit nonce of an owner on a token contract (LBTC by
 * default). This nonce is used in EIP-2612 permit operations.
 *
 * @param {IGetPermitNonceParams} parameters - The parameters.
 * @param {Address} parameters.owner - The account address.
 * @param {PermitNonceToken} parameters.token - The optional token, defaults to LBTC.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {string} parameters.rpcUrl - The optional rpc url.
 * @param {Env} parameters.env - The optional environment identifier.
 */
export async function getPermitNonce({
  owner,
  token = Token.LBTC,
  chainId,
  rpcUrl,
  env = DEFAULT_ENV,
}: IGetPermitNonceParams): Promise<string> {
  const environment = env || determineEnv(chainId);

  const publicClient = makePublicClient({ chainId, rpcUrl });
  // The ERC-20 itself, never a bridge adapter: the nonce lives on the token.
  const tokenContract = await getTokenContractInfo(
    token,
    chainId,
    environment,
    AddressKind.Token,
  );

  const nonce = await publicClient.readContract({
    abi: NONCES_ABI,
    address: tokenContract.address as Address,
    functionName: 'nonces',
    args: [owner],
  });

  return String(nonce);
}
