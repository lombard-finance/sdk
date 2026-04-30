/**
 * BTC Service
 *
 * Provides Bitcoin-specific operations via mempool API.
 *
 * @module services/BtcService
 */

import type {
  BtcNetworkMode,
  BtcService as IBtcService } from '@lombard.finance/sdk-common';

import { getCurrentBlockHeight } from '../chains/btc/client/getCurrentBlockHeight';

/**
 * BTC Service
 *
 * Implementation of the BtcService interface from sdk-common.
 * Provides Bitcoin blockchain operations.
 */
export class BtcService implements IBtcService {
  /**
   * Get current block height from mempool
   */
  async getCurrentBlockHeight(network: BtcNetworkMode): Promise<number> {
    return getCurrentBlockHeight(network);
  }
}
