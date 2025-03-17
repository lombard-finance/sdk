import {
  Vault,
  VaultNameMap,
  VEDA_VAULT_SPENDER_CONTRACTS,
} from '../../vaults';
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
      key: Vault.Veda,
      name: VaultNameMap[Vault.Veda],
      address: VEDA_VAULT_SPENDER_CONTRACTS[OChainId.holesky],
    },
  ],
  [OChainId.ethereum]: [
    {
      key: Vault.Veda,
      name: VaultNameMap[Vault.Veda],
      address: VEDA_VAULT_SPENDER_CONTRACTS[OChainId.ethereum],
    },
  ],
  [OChainId.binanceSmartChain]: [
    {
      key: Vault.Veda,
      name: VaultNameMap[Vault.Veda],
      address: VEDA_VAULT_SPENDER_CONTRACTS[OChainId.binanceSmartChain],
    },
  ],
  [OChainId.binanceSmartChainTestnet]: [
    {
      key: Vault.Veda,
      name: VaultNameMap[Vault.Veda],
      address: VEDA_VAULT_SPENDER_CONTRACTS[OChainId.binanceSmartChainTestnet],
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
