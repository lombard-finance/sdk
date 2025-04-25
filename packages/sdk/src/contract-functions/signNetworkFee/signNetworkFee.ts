import BigNumber from 'bignumber.js';
import { makeWalletClient } from '../../clients/wallet-client';
import { CommonWriteParameters } from '../../common/parameters';
import { DAY, now, toUnix } from '../../utils/time';
import { Hex } from 'viem';
import { getTokenContractInfo } from '../../tokens/tokens';
import { Token } from '../../tokens/token-addresses';

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
 * @param {BigNumber.Value} parameters.fee - The fee amount (in satoshis).
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
  env,
}: ISignNetworkFeeParams): Promise<ISignNetworkFeeResponse> {
  const lbtcContract = getTokenContractInfo(Token.LBTC, chainId, env);
  const walletClient = makeWalletClient({
    chainId,
    provider,
  });

  type TypedData = Parameters<typeof walletClient.signTypedData>[0];
  const typedData: TypedData = {
    account,
    domain: {
      name: 'Lombard Staked Bitcoin',
      version: '1',
      chainId,
      verifyingContract: lbtcContract.address,
    },
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
