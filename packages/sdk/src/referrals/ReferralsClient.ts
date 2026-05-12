import { getDepositAddressReferrer } from '../api-functions/getDepositAddressReferrer';
import type { LombardSDK } from '../client/LombardSDK';

export interface ReferralLookupParams {
  /** Destination account that previously generated a BTC deposit address */
  address: string;
}

export interface ReferralLookupResult {
  hasDepositAddress: boolean;
  referrer?: string;
}

/**
 * Referral helper namespace.
 *
 * Provides read APIs for referral metadata so partners do not need to query
 * Lombard REST endpoints directly.
 */
export class ReferralsClient {
  constructor(private readonly sdk: LombardSDK) {}

  /**
   * Fetch the referrer bound to a previously generated BTC deposit address.
   */
  async lookupReferrer({
    address,
  }: ReferralLookupParams): Promise<ReferralLookupResult> {
    return getDepositAddressReferrer({
      address,
      env: this.sdk.config.env,
    });
  }
}
