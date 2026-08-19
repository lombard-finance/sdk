import { Abi, Address } from 'viem';

import { ChainId } from '../../common/chains';
import { Token } from '../../tokens/token-addresses';
import BTCE_VAULT_ABI from '../abi/BTCE_VAULT_ABI.json';
import VEDA_VAULT_ABI from '../abi/VEDA_VAULT_ABI.json';
import VEDA_VAULT_ACCOUNTANT_ABI from '../abi/VEDA_VAULT_ACCOUNTANT_ABI.json';
import VEDA_VAULT_BASE_ASSET_ABI from '../abi/VEDA_VAULT_BASE_ASSET_ABI.json';
// Real Veda BoringOnChainQueue (requestOnChainWithdraw flow).
import VEDA_VAULT_BORING_ONCHAIN_QUEUE_ABI from '../abi/VEDA_VAULT_BORING_ONCHAIN_QUEUE_ABI.json';
// NOTE: despite the name, this is the legacy AtomicQueue ABI (safeUpdateAtomicRequest).
import VEDA_VAULT_BORING_WITHDRAW_QUEUE_ABI from '../abi/VEDA_VAULT_BORING_WITHDRAW_QUEUE_ABI.json';
import VEDA_VAULT_LENS_ABI from '../abi/VEDA_VAULT_LENS_ABI.json';
import VEDA_VAULT_SPENDER_ABI from '../abi/VEDA_VAULT_SPENDER_ABI.json';
import VEDA_VAULT_TELLER_ABI from '../abi/VEDA_VAULT_TELLER_ABI.json';

type ContractInfo = {
  abi: Abi;
  address: Address;
  chainId: ChainId;
};

export const EARN_CHAINS = [
  ChainId.ethereum,
  ChainId.base,
  ChainId.binanceSmartChain,
] as const;

export type EarnChain = (typeof EARN_CHAINS)[number];
export const isEarnChain = (chainId: number): chainId is EarnChain =>
  EARN_CHAINS.includes(chainId as EarnChain);

export const EARN_CHAIN_TO_NETWORK_MAP: Record<EarnChain, string> = {
  [ChainId.ethereum]: 'ethereum',
  [ChainId.base]: 'base',
  [ChainId.binanceSmartChain]: 'bnb',
};

export const NETWORK_TO_EARN_CHAIN_MAP: Record<string, EarnChain> = {
  ethereum: ChainId.ethereum,
  base: ChainId.base,
  bnb: ChainId.binanceSmartChain,
};

/** A list of chains where stake and bake is enabled */
export const EARN_STAKE_AND_BAKE_CHAINS = [
  ChainId.ethereum,
  // Testnets:
  ChainId.sepolia,
];
export type EarnStakeAndBakeChain = (typeof EARN_STAKE_AND_BAKE_CHAINS)[number];
export const isEarnStakeAndBakeChain = (
  chainId: number,
): chainId is EarnStakeAndBakeChain =>
  EARN_STAKE_AND_BAKE_CHAINS.includes(chainId as EarnStakeAndBakeChain);

export const EARN_DEFAULT_CHAIN_ID: EarnChain = ChainId.ethereum;

export const EARN_VAULT_CONTRACT = '0x5401b8620E5FB570064CA9114fd1e135fd77D57c';
export const EARN_VAULT_ACCOUNTANT_CONTRACT =
  '0x28634D0c5edC67CF2450E74deA49B90a4FF93dCE';
export const EARN_VAULT_LENS_CONTRACT =
  '0x5232bc0F5999f8dA604c42E1748A13a170F94A1B';

export const EARN_VAULT_TELLER_CONTRACTS: Record<EarnChain, ContractInfo> = {
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
} as const;

/** Stake and bake contracts */
export const EARN_VAULT_SPENDER_CONTRACTS: Record<
  EarnStakeAndBakeChain,
  ContractInfo
> = {
  [ChainId.ethereum]: {
    abi: VEDA_VAULT_SPENDER_ABI as Abi,
    address: '0xC8bbF6153D7Ba105f1399D992ebd32B0541996ef',
    chainId: ChainId.ethereum,
  },
  // Testnets:
  [ChainId.sepolia]: {
    abi: VEDA_VAULT_SPENDER_ABI as Abi,
    address: '0x77eD6a84fEF665156e81247ECbd43A847B8A6398',
    chainId: ChainId.sepolia,
  },
} as const;

export const EARN_VAULT_WITHDRAW_QUEUE_CONTRACTS: Record<
  EarnChain,
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
};

/**
 * Veda BoringOnChainQueue — the new withdrawal queue that replaces the legacy
 * AtomicQueue (`EARN_VAULT_WITHDRAW_QUEUE_CONTRACTS`) for LBTCv withdrawals.
 *
 * Deployed on Ethereum only for LBTCv. The withdraw flow routes here when the
 * caller passes `queue: 'boring'` to `withdrawEarn`; otherwise it stays on the
 * AtomicQueue so a rollback needs no code change. Kept a Partial<Record> since
 * only Ethereum has a deployment today.
 */
export const EARN_VAULT_BORING_QUEUE_CONTRACTS: Partial<
  Record<EarnChain, ContractInfo>
> = {
  [ChainId.ethereum]: {
    abi: VEDA_VAULT_BORING_ONCHAIN_QUEUE_ABI as Abi,
    address: '0x4a20F4948c435fDA923399F89800CdC373de88cB',
    chainId: ChainId.ethereum,
  },
};

export const EARN_VAULT_BASE_ASSET = {
  abi: VEDA_VAULT_BASE_ASSET_ABI,
  symbol: 'WBTC',
  displayName: 'wBTC',
  address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  decimals: 8,
};

/**
 * BTCe is an ERC4626 wrapper vault around the Veda vault's LBTCv share token.
 * Holders of BTCe shares have a claim on the underlying LBTCv position.
 *
 * The wrapper is currently a 1:1 pass-through (totalSupply == totalAssets,
 * convertToAssets(1e8) == 1e8 on every supported chain). Convert through
 * `convertToAssets` rather than naive summation in case fees or rebases ever
 * change the ratio.
 *
 * Currently deployed at the same address on every supported chain, but kept
 * in a Record so future deployments can diverge without an API change.
 */
export const BTCE_VAULT_CHAINS = [
  ChainId.ethereum,
  ChainId.base,
  ChainId.binanceSmartChain,
] as const;

export type BtceVaultChain = (typeof BTCE_VAULT_CHAINS)[number];

export const isBtceVaultChain = (chainId: number): chainId is BtceVaultChain =>
  BTCE_VAULT_CHAINS.includes(chainId as BtceVaultChain);

export const BTCE_VAULT_CONTRACTS: Record<BtceVaultChain, Address> = {
  [ChainId.ethereum]: '0x3a4baaBf4DC9910596821615e848f0e6545762F3',
  [ChainId.base]: '0x3a4baaBf4DC9910596821615e848f0e6545762F3',
  [ChainId.binanceSmartChain]: '0x3a4baaBf4DC9910596821615e848f0e6545762F3',
};

export const BTCE_VAULT_DECIMALS = 8;

export const BTCE_VAULT = {
  abi: BTCE_VAULT_ABI as Abi,
  decimals: BTCE_VAULT_DECIMALS,
  chains: BTCE_VAULT_CHAINS,
  contracts: BTCE_VAULT_CONTRACTS,
} as const;

/**
 * Bitcoin Earn vault configuration. Single underlying vault (Veda Labs'
 * BoringVault); the SDK historically keyed this by a `Vault` enum that's now
 * been removed in favor of this flat const. Internal helpers reference this
 * directly.
 */
export const EARN_VAULT = {
  defaultChainId: EARN_DEFAULT_CHAIN_ID,
  chains: EARN_CHAINS,
  tokens: {
    [Token.LBTC]: EARN_CHAINS,
    [Token.BTCBinance]: [ChainId.binanceSmartChain],
    [Token.cbBTC]: [ChainId.ethereum, ChainId.base],
    [Token.eBTC]: [ChainId.ethereum],
    [Token.wBTC]: [ChainId.ethereum],
  },
  stakeAndBakeChains: EARN_STAKE_AND_BAKE_CHAINS,
  decimals: 8,
  vaultContract: {
    abi: VEDA_VAULT_ABI,
    address: EARN_VAULT_CONTRACT,
  },
  accountantContract: {
    abi: VEDA_VAULT_ACCOUNTANT_ABI,
    address: EARN_VAULT_ACCOUNTANT_CONTRACT,
  },
  lensContract: {
    abi: VEDA_VAULT_LENS_ABI,
    address: EARN_VAULT_LENS_CONTRACT,
  },
  spenderContracts: EARN_VAULT_SPENDER_CONTRACTS,
  tellerContracts: EARN_VAULT_TELLER_CONTRACTS,
  withdrawQueueContracts: EARN_VAULT_WITHDRAW_QUEUE_CONTRACTS,
  boringQueueContracts: EARN_VAULT_BORING_QUEUE_CONTRACTS,

  queueWithdrawDiscountPercent: '0.01',
  queueWithdrawDaysValid: '14',

  /**
   * BoringQueue `discount` in basis points. Must sit within the withdraw
   * asset's on-chain [minDiscount, maxDiscount] bounds or the request reverts
   * with `BoringOnChainQueue__BadDiscount` (LBTC live bounds: 0–10 bps).
   */
  boringQueueDiscountBps: '1',
  /**
   * BoringQueue request validity window in days. Converted to
   * `secondsToDeadline`; must be >= the asset's on-chain
   * `minimumSecondsToDeadline` or the request reverts with
   * `BoringOnChainQueue__BadDeadline` (LBTC live minimum: 20 days).
   */
  boringQueueDaysValid: '21',
} as const;
