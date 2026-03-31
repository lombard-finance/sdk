/**
 * Solana Service Implementation
 *
 * Provides Solana-specific operations for LBTC destination signing, redeem and deposit.
 *
 * @module services/SolanaServiceImpl
 */

import type { Env, SolanaService } from '@lombard.finance/sdk-common';

import type { ISolanaWalletProvider, SolanaNetwork } from '../types';
import { deposit } from '../web3Sdk/deposit/deposit';
import { redeem } from '../web3Sdk/redeem/redeem';
import { redeemForBtc } from '../web3Sdk/redeemToken/redeemForBtc';
import { signLbtcDestinationAddrSolana } from '../web3Sdk/signLbtcDestinationAddrSolana';

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
   * Redeem BTC.b or LBTC on Solana to receive BTC
   *
   * Burns the source token and sends a GMP message to trigger a BTC payout.
   */
  async redeemForBtc(args: {
    amount: string;
    btcAddress: string;
    network: string;
    env?: Env;
    tokenMint?: string;
  }): Promise<{ signature: string }> {
    const provider = (await this.getProvider()) as ISolanaWalletProvider;

    const signature = await redeemForBtc(provider, {
      amount: args.amount,
      btcAddress: args.btcAddress,
      network: args.network as SolanaNetwork,
      env: args.env,
      tokenMint: args.tokenMint,
    });

    return { signature };
  }

  /**
   * Generic redeem via Asset Router (default: LBTC → BTC.b)
   */
  async redeem(args: {
    amount: string;
    recipient: string;
    network: string;
    env?: Env;
    tokenMint?: string;
    toLchainId?: string;
    toTokenAddress?: string;
  }): Promise<{ signature: string }> {
    const provider = (await this.getProvider()) as ISolanaWalletProvider;

    const signature = await redeem(provider, {
      amount: args.amount,
      recipient: args.recipient,
      network: args.network as SolanaNetwork,
      env: args.env,
      tokenMint: args.tokenMint,
      toLchainId: args.toLchainId,
      toTokenAddress: args.toTokenAddress,
    });

    return { signature };
  }

  /**
   * Deposit via Asset Router (default: BTC.b → LBTC)
   */
  async deposit(args: {
    amount: string;
    recipient: string;
    network: string;
    env?: Env;
    sourceTokenMint?: string;
    toLchainId?: string;
    toTokenAddress?: string;
  }): Promise<{ signature: string }> {
    const provider = (await this.getProvider()) as ISolanaWalletProvider;

    const signature = await deposit(provider, {
      amount: args.amount,
      recipient: args.recipient,
      network: args.network as SolanaNetwork,
      env: args.env,
      sourceTokenMint: args.sourceTokenMint,
      toLchainId: args.toLchainId,
      toTokenAddress: args.toTokenAddress,
    });

    return { signature };
  }
}
