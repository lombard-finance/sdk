import { oft, OftPDA } from '@layerzerolabs/oft-v2-solana-sdk';
import { Env } from '@lombard.finance/sdk-common';
import { publicKey } from '@metaplex-foundation/umi';
import { PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';

import { getConfig, getRpcEndpoint } from '../const/getConfig';
import { getMinimalUmiInstance } from '../utils/bridgeUtils';
import { ErrorCode, SolanaSdkError } from '../utils/errors';

// Constants
const LBTC_DECIMALS = 8;

interface GetOftAmountCanBeSentParams {
  env: Env;
  destinationLzEndpointId: number;
  rpcUrl?: string;
}

/**
 * Fetches the configured rate limit for sending OFT tokens to a specific destination chain.
 * This reads the PeerConfig account associated with the OFT program and destination EID
 * using the LayerZero OFT SDK helpers.
 *
 * @param params - Parameters including environment and destination EID.
 * @returns The currently available amount that can be sent, adjusted for decimals.
 */
export async function getOftAmountCanBeSent({
  env,
  destinationLzEndpointId,
  rpcUrl,
}: GetOftAmountCanBeSentParams): Promise<BigNumber> {
  try {
    const config = getConfig(env);
    const effectiveRpcUrl = rpcUrl || getRpcEndpoint(env);
    const umi = getMinimalUmiInstance(effectiveRpcUrl);
    const oftProgramId = new PublicKey(config.lzOftAdapter);
    const [peer] = new OftPDA(publicKey(oftProgramId)).peer(
      publicKey(config.lzOftStore),
      destinationLzEndpointId,
    );
    const peerConfig = await oft.accounts.fetchPeerConfig(umi, peer);

    if (peerConfig.outboundRateLimiter.__option === 'None') {
      return new BigNumber(0);
    }

    const tokens = new BigNumber(
      peerConfig.outboundRateLimiter.value.tokens.toString(),
    );
    const refillRate = new BigNumber(
      peerConfig.outboundRateLimiter.value.refillPerSecond.toString(),
    );
    const availableTokens = new BigNumber(
      new BigNumber(Date.now() / 1000).minus(
        new BigNumber(
          peerConfig.outboundRateLimiter.value.lastRefillTime.toString(),
        ),
      ),
    )
      .multipliedBy(refillRate)
      .plus(tokens);

    const capacity = new BigNumber(
      peerConfig.outboundRateLimiter.value.capacity.toString(),
    );

    // Return the minimum of available tokens and capacity
    return BigNumber.min(availableTokens, capacity).shiftedBy(-LBTC_DECIMALS);
  } catch (error) {
    throw SolanaSdkError.wrap(
      error,
      ErrorCode.RPC_ERROR,
      'Failed to fetch Solana OFT rate limit',
    );
  }
}
