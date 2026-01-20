/**
 * Starknet Service Implementation
 *
 * Provides Starknet-specific operations for LBTC destination signing and unstaking.
 *
 * @module services/StarknetServiceImpl
 */

import type { Env, StarknetService } from '@lombard.finance/sdk-common';
import type { WalletAccount } from 'starknet';

import { redeem } from '../contract-functions/redeem';
import { Token } from '../tokens/lib/tokens';
import { StarknetChainId } from '../utils/chains';
import { signLbtcDestinationAddrStarknet } from '../wallet-functions/sign-message';

/**
 * Provider resolver function type
 */
type ProviderResolver = () => Promise<unknown>;

/**
 * Starknet wallet provider interface
 */
interface StarknetWalletProvider {
  getProvider: () => WalletAccount;
}

/**
 * Starknet Service Implementation
 *
 * Wraps low-level Starknet functions into a clean service interface.
 * Instantiated by starknetModule().
 */
export class StarknetServiceImpl implements StarknetService {
  constructor(private readonly getProvider: ProviderResolver) {}

  /**
   * Sign LBTC destination address for Starknet minting
   */
  async signLbtcDestination(args: {
    chainId: string;
  }): Promise<{ signature: string; pubKey: string }> {
    const provider = await this.getProvider();
    const walletProvider = provider as StarknetWalletProvider;
    const walletAccount = walletProvider.getProvider();

    const result = await signLbtcDestinationAddrStarknet({
      walletAccount,
      chainId: args.chainId as StarknetChainId,
    });

    return {
      signature: result.signatureHex,
      pubKey: result.pubKey,
    };
  }

  /**
   * Unstake LBTC on Starknet to receive BTC
   *
   * Burns LBTC on Starknet and releases BTC to the provided Bitcoin address.
   */
  async unstake(args: {
    amount: string;
    btcAddress: string;
    env: string;
  }): Promise<{ txHash: string }> {
    const provider = await this.getProvider();
    const walletProvider = provider as StarknetWalletProvider;
    const walletAccount = walletProvider.getProvider();

    const txHash = await redeem({
      amount: args.amount,
      btcAddress: args.btcAddress,
      token: Token.LBTC,
      walletAccount,
      env: args.env as Env,
    });

    return { txHash };
  }
}
