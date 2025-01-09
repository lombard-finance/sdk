import { OChainId, TChainId } from '../../common/types/types';

export interface IStakeAndBakeVault {
  /**
   * Unique identifier for the vault
   */
  key: string;
  /**
   * Display name of the vault
   */
  name: string;
  /**
   * Contract address of the vault
   */
  address: string;
}

export const STAKE_AND_BAKE_VAULTS: Record<number, IStakeAndBakeVault[]> = {
  [OChainId.holesky]: [
    {
      key: 'veda',
      name: 'Veda / Lombard DeFi Vault',
      address: '0x52BD640617eeD47A00dA0da93351092D49208d1d',
    },
  ],
} as const;

export const SUPPORTED_STAKE_AND_BAKE_CHAINS = Object.keys(
  STAKE_AND_BAKE_VAULTS,
).map(Number);

export const getStakeAndBakeVaults = (
  chainId: TChainId,
): IStakeAndBakeVault[] => {
  const vaults = STAKE_AND_BAKE_VAULTS[chainId];
  if (!vaults?.length) {
    throw new Error(`No vaults configured for chain ID ${chainId}`);
  }
  return vaults;
};

export const getStakeAndBakeSpenderContract = (
  chainId: TChainId,
  vaultKey: string,
): string => {
  const vaults = getStakeAndBakeVaults(chainId);
  const vault = vaults.find(v => v.key === vaultKey);
  if (!vault) {
    throw new Error(
      `No vault found with key ${vaultKey} for chain ID ${chainId}`,
    );
  }
  return vault.address;
};
