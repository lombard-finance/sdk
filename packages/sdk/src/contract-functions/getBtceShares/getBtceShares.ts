import BigNumber from 'bignumber.js';
import { Address, getContract, isAddress } from 'viem';

import { makePublicClient } from '../../clients/public-client';
import { CommonParameters } from '../../common/parameters';
import { getErrorMessage } from '../../utils/err';
import { fromSatoshi } from '../../utils/satoshi';
import { BTCE_VAULT, isBtceVaultChain } from '../../vaults/lib/config';

export interface IGetBtceSharesParameters extends CommonParameters {
  /**
   * The address of the BTCe holder.
   */
  address: string;
}

/**
 * Gets the amount of BTCe shares owned by the provided address on the
 * specified chain.
 *
 * BTCe is an ERC4626 wrapper around the Veda vault's LBTCv share token. Use
 * {@link getEarnPosition} when you want the user's full Bitcoin Earn position
 * (LBTCv + BTCe valued in LBTC) in a single call.
 *
 * @param {IGetBtceSharesParameters} parameters - The parameters.
 * @param {string} parameters.address - The address of the BTCe holder.
 * @param {ChainId} parameters.chainId - The chain id (must be a BTCe-supported chain).
 * @param {string} parameters.rpcUrl - The optional rpc url.
 *
 * @return {Promise<BigNumber>} BTCe balance as an 8-decimal BigNumber.
 */
export async function getBtceShares({
  chainId,
  rpcUrl,
  address,
}: IGetBtceSharesParameters): Promise<BigNumber> {
  if (!isAddress(address)) {
    throw new Error(`Invalid address: ${address}`);
  }

  if (!isBtceVaultChain(chainId)) {
    throw new Error(
      `BTCe is not supported on chain ${chainId}. Supported chains: ${BTCE_VAULT.chains.join(', ')}.`,
    );
  }

  try {
    const client = makePublicClient({ chainId, rpcUrl });

    const btceContract = getContract({
      abi: BTCE_VAULT.abi,
      address: BTCE_VAULT.contracts[chainId],
      client,
    });

    const balanceRaw = (await btceContract.read.balanceOf([
      address as Address,
    ])) as bigint;

    return fromSatoshi(String(balanceRaw));
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
