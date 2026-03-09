/**
 * Solana Service Implementation
 *
 * Provides Solana-specific operations for LBTC destination signing and unstaking.
 *
 * @module services/SolanaServiceImpl
 */

import type { Env, SolanaService } from '@lombard.finance/sdk-common';

import type { ISolanaWalletProvider, SolanaNetwork } from '../types';
import { redeemForBtc } from '../web3Sdk/redeemToken/redeemForBtc';
import { signLbtcDestinationAddrSolana } from '../web3Sdk/signLbtcDestinationAddrSolana';
import { unstakeLBTC } from '../web3Sdk/unstakeLBTC/unstakeLBTC';

/**
 * Provider resolver function type
 */
type ProviderResolver = () => Promise<unknown>;

/**
 * Solana Service Implementation
 *
 * Wraps low-level Solana functions into a clean service interface.
 * Instantiated by solanaModule().
 */
export class SolanaServiceImpl implements SolanaService {
  constructor(private readonly getProvider: ProviderResolver) {}

  /**
   * Sign LBTC destination address for Solana minting
   */
  async signLbtcDestination(args: {
    network: string;
  }): Promise<{ signature: string }> {
    const provider = (await this.getProvider()) as ISolanaWalletProvider;
    return signLbtcDestinationAddrSolana({
      provider,
      network: args.network as SolanaNetwork,
    });
  }

  /**
   * Unstake LBTC on Solana to receive BTC
   *
   * Burns LBTC on Solana and releases BTC to the provided Bitcoin address.
   */
  async unstake(args: {
    amount: string;
    btcAddress: string;
    network: string;
  }): Promise<{ txHash: string }> {
    const provider = (await this.getProvider()) as ISolanaWalletProvider;

    const txHash = await unstakeLBTC(provider, {
      amount: args.amount,
      btcAddress: args.btcAddress,
      network: args.network as SolanaNetwork,
    });

    return { txHash };
  }

  /**
   * Redeem BTC.b on Solana to receive BTC
   *
   * Burns BTC.b and sends a GMP message to trigger a BTC payout.
   */
  async redeemForBtc(args: {
    amount: string;
    btcAddress: string;
    network: string;
    env?: Env;
  }): Promise<{ txHash: string }> {
    const provider = (await this.getProvider()) as ISolanaWalletProvider;

    const txHash = await redeemForBtc(provider, {
      amount: args.amount,
      btcAddress: args.btcAddress,
      network: args.network as SolanaNetwork,
      env: args.env,
    });

    return { txHash };
  }
}
