import { OChainId } from '../common/types/types';

import VEDA_VAULT_ABI from './abi/VEDA_VAULT_ABI.json';
import VEDA_VAULT_ACCOUNTANT_ABI from './abi/VEDA_VAULT_ACCOUNTANT_ABI.json';
import VEDA_VAULT_LENS_ABI from './abi/VEDA_VAULT_LENS_ABI.json';

export const VEDA_VAULT_CHAIN_ID = OChainId.ethereum;
export const VEDA_VAULT_CONTRACT = '0x5401b8620E5FB570064CA9114fd1e135fd77D57c';
export const VEDA_VAULT_ACCOUNTANT_CONTRACT =
  '0x28634D0c5edC67CF2450E74deA49B90a4FF93dCE';
export const VEDA_VAULT_LENS_CONTRACT =
  '0x5232bc0F5999f8dA604c42E1748A13a170F94A1B';

export const VEDA_VAULT_SPENDER_CONTRACTS = {
  [OChainId.holesky]: '0x4A3cD83CEbb91E0Cd31EdA2Ee0F4AebfcCFCbBb6',
  [OChainId.ethereum]: '0xC8bbF6153D7Ba105f1399D992ebd32B0541996ef',
  [OChainId.binanceSmartChain]: '0xC8bbF6153D7Ba105f1399D992ebd32B0541996ef',
  [OChainId.binanceSmartChainTestnet]:
    '0x72143309A662bDB4aad5cA65Ab59eD8977D047C5',
} as const;

export enum Vault {
  Veda = 'veda',
}

export const VaultNameMap = {
  [Vault.Veda]: 'Veda / Lombard DeFi Vault',
} as const;

export const VAULTS = {
  [Vault.Veda]: {
    defaultChainId: VEDA_VAULT_CHAIN_ID,
    chains: [
      OChainId.base,
      OChainId.binanceSmartChain,
      OChainId.corn,
      OChainId.ethereum,
    ],
    decimals: 8,
    vaultContract: {
      abi: VEDA_VAULT_ABI,
      address: VEDA_VAULT_CONTRACT,
    },
    accountantContract: {
      abi: VEDA_VAULT_ACCOUNTANT_ABI,
      address: VEDA_VAULT_ACCOUNTANT_CONTRACT,
    },
    lensContract: {
      abi: VEDA_VAULT_LENS_ABI,
      address: VEDA_VAULT_LENS_CONTRACT,
    },
    spenderContracts: VEDA_VAULT_SPENDER_CONTRACTS,
  },
} as const;
