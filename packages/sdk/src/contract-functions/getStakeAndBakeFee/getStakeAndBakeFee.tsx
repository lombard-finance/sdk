import { getErrorMessage } from '../../utils/err';
import { CommonParameters } from '../../common/parameters';
import { isVedaVaultStakeAndBakeChain, Vault, VAULTS } from '../../vaults';
import { makePublicClient } from '../../clients/public-client';
import { getContract } from 'viem';
import { fromSatoshi } from '../../utils/satoshi';
import BigNumber from 'bignumber.js';

export interface IGetStakeAndBakeFeeParams
  extends Omit<CommonParameters, 'env'> {
  /**
   * The DeFi vault identifier.
   */
  vaultKey?: Vault;
}

/**
 * Get Stake and bake fee.
 *
 * @param {IGetStakeAndBakeFeeParams} parameters - The parameters.
 * @param {Vault} parameters.vaultKey - The optional DeFi vault identifier.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {string} parameters.rpcUrl - The optional rpc url.
 *
 * @returns Stake and bake fee amount.
 */
export async function getStakeAndBakeFee({
  vaultKey = Vault.Veda,
  chainId,
  rpcUrl,
}: IGetStakeAndBakeFeeParams): Promise<BigNumber> {
  const vault = VAULTS[vaultKey];
  if (!vault) {
    throw new Error(`Unknown vault key: ${vaultKey}`);
  }

  if (!isVedaVaultStakeAndBakeChain(chainId)) {
    throw new Error(
      `Unsupported chain id: ${chainId}. Please switch to one of the supported chains: ${vault.stakeAndBakeChains.join(', ')}`,
    );
  }

  const spender = vault.spenderContracts[chainId];
  if (!spender) {
    throw new Error('Could not retrieve the stake and bake contract.');
  }

  try {
    const client = makePublicClient({ chainId, rpcUrl });
    const spenderContract = getContract({
      abi: spender.abi,
      address: spender.address,
      client,
    });
    const fee = await spenderContract.read.getStakeAndBakeFee();
    return fromSatoshi(String(fee));
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    throw new Error(errorMessage);
  }
}
