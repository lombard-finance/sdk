/**
 * Sui Service Implementation
 *
 * Provides Sui-specific operations for LBTC destination signing and unstaking.
 *
 * @module services/SuiServiceImpl
 */

import type { Env, SuiService } from '@lombard.finance/sdk-common';
import { getFullnodeUrl,SuiClient } from '@mysten/sui/client';
import type {
  SuiChain,
  SuiSignPersonalMessageFeature,
  SuiSignTransactionFeature,
} from '@mysten/wallet-standard';
import type { WalletWithFeatures } from '@wallet-standard/base';
import type { WalletAccount } from '@wallet-standard/core';
import BigNumber from 'bignumber.js';

import { signLbtcDestinationAddrSui } from '../web3Sdk/signLbtcDestionationAddrSui';
import { unstakeLBTC } from '../web3Sdk/unstakeLBTC/unstakeLBTC';

/**
 * Provider resolver function type
 */
type ProviderResolver = () => Promise<unknown>;

/**
 * Sui wallet features required for signing and transactions
 */
type SuiWalletFeatures = SuiSignPersonalMessageFeature & SuiSignTransactionFeature;

/**
 * Sui wallet provider interface
 */
interface SuiWalletProvider {
  getWallet: () => WalletWithFeatures<SuiWalletFeatures>;
  getWalletAccount: () => WalletAccount;
}

/**
 * Get Sui network from chain ID
 */
function getSuiNetworkFromChainId(chainId: string): 'mainnet' | 'testnet' | 'devnet' {
  if (chainId.includes('mainnet')) return 'mainnet';
  if (chainId.includes('testnet')) return 'testnet';
  return 'devnet';
}

/**
 * Sui Service Implementation
 *
 * Wraps low-level Sui functions into a clean service interface.
 * Instantiated by suiModule().
 */
export class SuiServiceImpl implements SuiService {
  constructor(private readonly getProvider: ProviderResolver) {}

  /**
   * Sign LBTC destination address for Sui minting
   */
  async signLbtcDestination(args: {
    chainId: string;
  }): Promise<{ signature: string }> {
    const provider = await this.getProvider();
    const walletProvider = provider as SuiWalletProvider;

    const { signature } = await signLbtcDestinationAddrSui({
      chainId: args.chainId as SuiChain,
      wallet: walletProvider.getWallet(),
      account: walletProvider.getWalletAccount(),
    });

    return { signature };
  }

  /**
   * Unstake LBTC on Sui to receive BTC
   *
   * Burns LBTC on Sui and releases BTC to the provided Bitcoin address.
   */
  async unstake(args: {
    amount: string;
    btcAddress: string;
    chainId: string;
    env: string;
  }): Promise<{ txHash: string }> {
    const provider = await this.getProvider();
    const walletProvider = provider as SuiWalletProvider;

    // Create Sui client
    const network = getSuiNetworkFromChainId(args.chainId);
    const client = new SuiClient({ url: getFullnodeUrl(network) });

    // Execute unstake
    const result = await unstakeLBTC({
      chainId: args.chainId as SuiChain,
      wallet: walletProvider.getWallet(),
      walletAccount: walletProvider.getWalletAccount(),
      client,
      btcAddress: args.btcAddress,
      amount: new BigNumber(args.amount),
      env: args.env as Env,
    });

    return { txHash: result.digest };
  }
}
