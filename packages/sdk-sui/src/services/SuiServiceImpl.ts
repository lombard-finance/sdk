/**
 * Sui Service Implementation
 *
 * Provides Sui-specific operations for LBTC destination signing and unstaking.
 *
 * @module services/SuiServiceImpl
 */

import type { Env, SuiService } from '@lombard.finance/sdk-common';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import type {
  SuiChain,
  SuiSignPersonalMessageFeature,
  SuiSignTransactionFeature,
} from '@mysten/wallet-standard';
import type { WalletWithFeatures } from '@wallet-standard/base';
import type { WalletAccount } from '@wallet-standard/core';
import BigNumber from 'bignumber.js';

import type {
  ISuiNetworkGrpcOptions,
  SuiNetwork,
} from '../utils/createSuiGrpcClient';
import {
  createSuiGrpcClient,
  resolveSuiGrpcOptions,
} from '../utils/createSuiGrpcClient';
import { signLbtcDestinationAddrSui } from '../web3Sdk/signLbtcDestionationAddrSui';
import { unstakeLBTC } from '../web3Sdk/unstakeLBTC/unstakeLBTC';

/**
 * Provider resolver function type
 */
type ProviderResolver = () => Promise<unknown>;

/**
 * Sui wallet features required for signing and transactions
 */
type SuiWalletFeatures = SuiSignPersonalMessageFeature &
  SuiSignTransactionFeature;

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
function getSuiNetworkFromChainId(
  chainId: string,
): 'mainnet' | 'testnet' | 'devnet' {
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
  /**
   * One client per network, kept for the life of the service. The failover
   * transport remembers the endpoint that last worked, and a client built per
   * call would throw that away, paying the full timeout of a dead head endpoint
   * on every operation.
   */
  private readonly clients = new Map<SuiNetwork, SuiGrpcClient>();

  constructor(
    private readonly getProvider: ProviderResolver,
    private readonly options: ISuiNetworkGrpcOptions = {},
  ) {}

  private getClient(network: SuiNetwork): SuiGrpcClient {
    const existing = this.clients.get(network);
    if (existing) {
      return existing;
    }

    const client = createSuiGrpcClient(
      network,
      resolveSuiGrpcOptions(network, this.options),
    );
    this.clients.set(network, client);

    return client;
  }

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

    const client = this.getClient(getSuiNetworkFromChainId(args.chainId));

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
