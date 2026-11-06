import BigNumber from 'bignumber.js';
import { Hex } from 'viem';

import { makeWalletClient } from '../../clients/wallet-client';
import { CommonWriteParameters } from '../../common/parameters';
import {
  assertMintingFeeWithinBounds,
  assertValidExpiry,
} from '../../shared/validation/signing';
import { Token } from '../../tokens/token-addresses';
import { getTokenContractInfo } from '../../tokens/tokens';
import { DAY, now, toUnix } from '../../utils/time';
import { getTokenEip712Domain } from '../getTokenEip712Domain/getTokenEip712Domain';

export interface ISignNetworkFeeParams extends CommonWriteParameters {
  /**
   * The authorized fee amount.
   * Recommended amount is the same as retuned from `getLBTCMintingFee`.
   */
  fee: BigNumber.Value;
  /**
   * The expiration time of the signature.
   * Defaults to 24h from now.
   */
  expiry?: number;
  /**
   * The token to use for signing.
   * Defaults to Token.LBTC for backwards compatibility.
   */
  token?: Token;
}

export interface ISignNetworkFeeResponse {
  /**
   * The signature.
   */
  signature: Hex;
  /**
   * The typed data (JSON string) used for generating the returned signature.
   */
  typedData: string;
}

/**
 * Signs the network fee transaction in the current account.
 * Signing is necessary for the auto-mint.
 *
 * @param {ISignNetworkFeeParams} parameters - The parameters for signing network fee
 * @param {BigNumber.Value} parameters.fee - The fee amount (in satoshis): a whole number above zero and at most 100000 (0.001 BTC).
 * @param {number} parameters.expiry = The optional expiration UNIX time of the signature.
 * @param {Address} parameters.account - The EVM account address.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {EIP1193Provider} parameters.provider - The EIP1193 provider.
 * @param {string} parameters.rpcUrl - The optional rpc url.
 *
 * @returns {Promise<ISignNetworkFeeResponse>} A promise that resolves to the signature and typed data
 */
export async function signNetworkFee({
  fee,
  expiry = toUnix(now() + DAY),
  account,
  chainId,
  provider,
  rpcUrl,
  env,
  token = Token.LBTC,
}: ISignNetworkFeeParams): Promise<ISignNetworkFeeResponse> {
  // Checked before the wallet client is built, so the parameter that is wrong
  // is the one the error names. An unbounded expiry has no symptom anywhere:
  // the fee approval signs, is stored, and `checkFeeAuthorization` then reads
  // it as valid forever, so the user is never asked to renew it.
  assertValidExpiry(expiry);
  // The fee is a contract read the caller was told, and the approval lets the
  // claimer take it per mint while it is live: refuse zero and a figure no
  // real fee reaches before the wallet is asked. Callers that know the
  // deposit also bound it against that.
  assertMintingFeeWithinBounds(fee);

  const tokenContract = await getTokenContractInfo(token, chainId, env);
  const walletClient = makeWalletClient({
    chainId,
    provider,
  });

  type TypedData = Parameters<typeof walletClient.signTypedData>[0];
  const typedData: TypedData = {
    account,
    domain: await getTokenEip712Domain({
      chainId,
      tokenAddress: tokenContract.address,
      rpcUrl,
      env,
    }),
    message: {
      chainId,
      fee: BigInt(BigNumber(fee).toFixed()),
      expiry,
    },
    primaryType: 'feeApproval',
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      feeApproval: [
        { name: 'chainId', type: 'uint256' },
        { name: 'fee', type: 'uint256' },
        { name: 'expiry', type: 'uint256' },
      ],
    },
  };

  const signature = await walletClient.signTypedData(typedData);

  return {
    signature: signature,
    typedData: JSON.stringify(typedData, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v,
    ),
  };
}
