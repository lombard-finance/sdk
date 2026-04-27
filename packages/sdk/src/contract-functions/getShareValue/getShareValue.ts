import BigNumber from 'bignumber.js';
import { getContract } from 'viem';

import { makePublicClient } from '../../clients/public-client';
import { CommonParameters } from '../../common/parameters';
import { getErrorMessage } from '../../utils/err';
import { fromSatoshi } from '../../utils/satoshi';
import { warnDeprecated } from '../../utils/warnDeprecated';
import { isVedaVaultChain, Vault, VAULTS } from '../../vaults/lib/config';

export interface IGetShareValueParameters extends CommonParameters {
  /**
   * Optional DeFi vault identifier specifying the vault in use
   * @default {string} - "veda"
   */
  vaultKey?: Vault;
}

/**
 * Gets the value of a single share unit (in LBTC) from the specified vault.
 *
 * @deprecated Will be removed in 5.0.0. The exchange rate is included in the
 * response from {@link getEarnPosition}.
 *
 * @param {IGetShareValueParameters} parameters - The parameters.
 * @param {Vault} parameters.vaultKey - The optional DeFi vault identifier.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {string} parameters.rpcUrl - The optional rpc url.
 *
 * @returns {Promise<BigNumber>}
 */
export async function getShareValue({
  chainId,
  rpcUrl,
  vaultKey = Vault.Veda,
}: IGetShareValueParameters): Promise<BigNumber> {
  warnDeprecated('getShareValue', 'getEarnPosition');
  const vault = VAULTS[vaultKey];
  if (!vault) {
    throw new Error(`Unknown vault key: ${vaultKey}`);
  }

  if (!isVedaVaultChain(chainId)) {
    throw new Error(
      `Unsupported chain id: ${chainId}. Please switch to one of the supported chains: ${vault.chains.join(', ')}`,
    );
  }

  try {
    const client = makePublicClient({ chainId, rpcUrl });

    const accountantContract = getContract({
      abi: vault.accountantContract.abi,
      address: vault.accountantContract.address,
      client,
    });

    const exchangeRate = await accountantContract.read.getRate();
    return fromSatoshi(String(exchangeRate));
  } catch (err) {
    const errorMessage = getErrorMessage(err);
    throw new Error(errorMessage);
  }
}
