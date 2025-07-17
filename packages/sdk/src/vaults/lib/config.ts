import { Abi, Address } from 'viem';
import { ChainId } from '../../common/chains';
import { Token } from '../../tokens/token-addresses';
import VEDA_VAULT_ABI from '../abi/VEDA_VAULT_ABI.json';
import VEDA_VAULT_ACCOUNTANT_ABI from '../abi/VEDA_VAULT_ACCOUNTANT_ABI.json';
import VEDA_VAULT_BASE_ASSET_ABI from '../abi/VEDA_VAULT_BASE_ASSET_ABI.json';
import VEDA_VAULT_BORING_WITHDRAW_QUEUE_ABI from '../abi/VEDA_VAULT_BORING_WITHDRAW_QUEUE_ABI.json';
import VEDA_VAULT_LENS_ABI from '../abi/VEDA_VAULT_LENS_ABI.json';
import VEDA_VAULT_SPENDER_ABI from '../abi/VEDA_VAULT_SPENDER_ABI.json';
import VEDA_VAULT_TELLER_ABI from '../abi/VEDA_VAULT_TELLER_ABI.json';

type ContractInfo = {
  abi: Abi;
  address: Address;
  chainId: ChainId;
};

export const VEDA_VAULT_CHAINS = [
  ChainId.ethereum,
  ChainId.base,
  ChainId.binanceSmartChain,
  ChainId.corn,
] as const;

export type VedaVaultChain = (typeof VEDA_VAULT_CHAINS)[number];
export const isVedaVaultChain = (chainId: number): chainId is VedaVaultChain =>
  VEDA_VAULT_CHAINS.includes(chainId as VedaVaultChain);

export const VEDA_VAULT_CHAIN_TO_NETWORK_MAP: Record<VedaVaultChain, string> = {
  [ChainId.ethereum]: 'ethereum',
  [ChainId.base]: 'base',
  [ChainId.corn]: 'corn',
  [ChainId.binanceSmartChain]: 'bnb',
};

export const NETWORK_TO_VEDA_VAULT_CHAIN_MAP: Record<string, VedaVaultChain> = {
  ethereum: ChainId.ethereum,
  base: ChainId.base,
  corn: ChainId.corn,
  bnb: ChainId.binanceSmartChain,
};

/** A list of chains where stake and bake is enabled */
export const VEDA_VAULT_STAKE_AND_BAKE_CHAINS = [
  ChainId.ethereum,
  ChainId.binanceSmartChain,
  // Testnets:
  ChainId.binanceSmartChainTestnet,
  ChainId.holesky,
];
export type VedaVaultStakeAndBakeChain =
  (typeof VEDA_VAULT_STAKE_AND_BAKE_CHAINS)[number];
export const isVedaVaultStakeAndBakeChain = (
  chainId: number,
): chainId is VedaVaultStakeAndBakeChain =>
  VEDA_VAULT_STAKE_AND_BAKE_CHAINS.includes(
    chainId as VedaVaultStakeAndBakeChain,
  );

export const VEDA_VAULT_DEFAULT_CHAIN_ID: VedaVaultChain = ChainId.ethereum;

export const VEDA_VAULT_CONTRACT = '0x5401b8620E5FB570064CA9114fd1e135fd77D57c';
export const VEDA_VAULT_ACCOUNTANT_CONTRACT =
  '0x28634D0c5edC67CF2450E74deA49B90a4FF93dCE';
export const VEDA_VAULT_LENS_CONTRACT =
  '0x5232bc0F5999f8dA604c42E1748A13a170F94A1B';

export const VEDA_VAULT_TELLER_CONTRACTS: Record<VedaVaultChain, ContractInfo> =
  {
    [ChainId.ethereum]: {
      abi: VEDA_VAULT_TELLER_ABI as Abi,
      address: '0x4E8f5128F473C6948127f9Cbca474a6700F99bab',
      chainId: ChainId.ethereum,
    },
    [ChainId.base]: {
      abi: VEDA_VAULT_TELLER_ABI as Abi,
      address: '0x2eA43384F1A98765257bc6Cb26c7131dEbdEB9B3',
      chainId: ChainId.base,
    },
    [ChainId.binanceSmartChain]: {
      abi: VEDA_VAULT_TELLER_ABI as Abi,
      address: '0x2eA43384F1A98765257bc6Cb26c7131dEbdEB9B3',
      chainId: ChainId.binanceSmartChain,
    },
    [ChainId.corn]: {
      abi: VEDA_VAULT_TELLER_ABI as Abi,
      address: '0x2eA43384F1A98765257bc6Cb26c7131dEbdEB9B3',
      chainId: ChainId.corn,
    },
  } as const;

/** Stake and bake contracts */
export const VEDA_VAULT_SPENDER_CONTRACTS: Record<
  VedaVaultStakeAndBakeChain,
  ContractInfo
> = {
  [ChainId.ethereum]: {
    abi: VEDA_VAULT_SPENDER_ABI as Abi,
    address: '0xC8bbF6153D7Ba105f1399D992ebd32B0541996ef',
    chainId: ChainId.ethereum,
  },

  [ChainId.binanceSmartChain]: {
    abi: VEDA_VAULT_SPENDER_ABI as Abi,
    address: '0xC8bbF6153D7Ba105f1399D992ebd32B0541996ef',
    chainId: ChainId.binanceSmartChain,
  },
  // Testnets:
  [ChainId.holesky]: {
    abi: VEDA_VAULT_SPENDER_ABI as Abi,
    address: '0x4A3cD83CEbb91E0Cd31EdA2Ee0F4AebfcCFCbBb6',
    chainId: ChainId.holesky,
  },
  [ChainId.binanceSmartChainTestnet]: {
    abi: VEDA_VAULT_SPENDER_ABI as Abi,
    address: '0x72143309A662bDB4aad5cA65Ab59eD8977D047C5',
    chainId: ChainId.binanceSmartChainTestnet,
  },
} as const;

export const VEDA_VAULT_WITHDRAW_QUEUE_CONTRACTS: Record<
  VedaVaultChain,
  ContractInfo
> = {
  [ChainId.ethereum]: {
    abi: VEDA_VAULT_BORING_WITHDRAW_QUEUE_ABI as Abi,
    address: '0x3b4aCd8879fb60586cCd74bC2F831A4C5E7DbBf8',
    chainId: ChainId.ethereum,
  },
  [ChainId.base]: {
    abi: VEDA_VAULT_BORING_WITHDRAW_QUEUE_ABI as Abi,
    address: '0x3b4aCd8879fb60586cCd74bC2F831A4C5E7DbBf8',
    chainId: ChainId.ethereum,
  },
  [ChainId.binanceSmartChain]: {
    abi: VEDA_VAULT_BORING_WITHDRAW_QUEUE_ABI as Abi,
    address: '0x3b4aCd8879fb60586cCd74bC2F831A4C5E7DbBf8',
    chainId: ChainId.ethereum,
  },
  [ChainId.corn]: {
    abi: VEDA_VAULT_BORING_WITHDRAW_QUEUE_ABI as Abi,
    address: '0x3b4aCd8879fb60586cCd74bC2F831A4C5E7DbBf8',
    chainId: ChainId.ethereum,
  },
};

export const VEDA_VAULT_BASE_ASSET = {
  abi: VEDA_VAULT_BASE_ASSET_ABI,
  symbol: 'WBTC',
  displayName: 'wBTC',
  address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  decimals: 8,
};

export enum Vault {
  Veda = 'veda',
}

export const VaultNameMap = {
  [Vault.Veda]: 'Veda / Lombard DeFi Vault',
} as const;

export const VAULTS = {
  [Vault.Veda]: {
    defaultChainId: VEDA_VAULT_DEFAULT_CHAIN_ID,
    chains: VEDA_VAULT_CHAINS,
    tokens: {
      [Token.LBTC]: VEDA_VAULT_CHAINS,
      [Token.BTCB]: [ChainId.binanceSmartChain],
      [Token.cbBTC]: [ChainId.ethereum, ChainId.base],
      [Token.eBTC]: [ChainId.ethereum],
      [Token.wBTC]: [ChainId.ethereum],
      [Token.wBTCN]: [ChainId.corn],
    },
    stakeAndBakeChains: VEDA_VAULT_STAKE_AND_BAKE_CHAINS,
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
    tellerContracts: VEDA_VAULT_TELLER_CONTRACTS,
    withdrawQueueContracts: VEDA_VAULT_WITHDRAW_QUEUE_CONTRACTS,

    queueWithdrawDiscountPercent: '0.01',
    queueWithdrawDaysValid: '3',
  },
} as const;
