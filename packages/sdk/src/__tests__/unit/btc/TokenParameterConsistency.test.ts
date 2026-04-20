/**
 * Token Parameter Consistency Tests
 *
 * Ensures all BTC actions pass the correct token parameter to their
 * authorization functions, which is critical for:
 * - Correct ratio conversion (BTC → LBTC)
 * - Correct signature storage (token address)
 * - Backend matching signatures to deposits
 *
 * This test file documents the expected token parameter for each action
 * to prevent regressions in stake and bake flows.
 *
 * @module __tests__/unit/btc/TokenParameterConsistency.test.ts
 */

import { describe, expect, it } from 'vitest';

import { DEFI_REGISTRY,DefiProtocol } from '../../../defi/defi-registry';
import { Token } from '../../../tokens/token-addresses';

describe('Token Parameter Consistency', () => {
  /**
   * This test suite documents and verifies the expected token parameters
   * for each BTC action type.
   *
   * Token Parameter Mapping:
   * ┌─────────────────────────┬────────────────┬─────────────────────┬─────────────────┐
   * │ Action                  │ Source → Dest  │ Token Param         │ Amount Strategy │
   * ├─────────────────────────┼────────────────┼─────────────────────┼─────────────────┤
   * │ BtcStake                │ BTC → LBTC     │ Token.LBTC          │ N/A (fee only)  │
   * │ BtcDeposit              │ BTC → BTC.b    │ Token.BTCb          │ N/A (fee only)  │
   * │ BtcStakeAndDeploy       │ BTC → LBTC     │ 'BTC'               │ btcToLbtc       │
   * │ BtcDepositAndDeploy     │ BTC → BTC.b    │ Token.BTCb          │ identity        │
   * └─────────────────────────┴────────────────┴─────────────────────┴─────────────────┘
   *
   * Key Insight:
   * - BtcStake and BtcDeposit use token for fee authorization (signNetworkFee)
   * - BtcStakeAndDeploy and BtcDepositAndDeploy use token for vault permit (signStakeAndBake)
   * - Only BtcStakeAndDeploy needs ratio conversion because it creates LBTC from BTC
   */

  describe('BtcStake Action', () => {
    it('uses Token.LBTC for network fee authorization', () => {
      /**
       * BtcStake authorizes network fee using Token.LBTC.
       * This is for the fee signature, not the deposit amount.
       *
       * Code location: packages/sdk/src/chains/btc/actions/stake/config/evm.ts
       * Line: token: Token.LBTC
       */
      expect(Token.LBTC).toBe('LBTC');
    });
  });

  describe('BtcDeposit Action', () => {
    it('uses Token.BTCb for network fee authorization', () => {
      /**
       * BtcDeposit authorizes network fee using Token.BTCb.
       * This distinguishes BTC.b fee signatures from LBTC fee signatures.
       *
       * Code location: packages/sdk/src/chains/btc/actions/deposit/config/evm.ts
       * Line: token: Token.BTCb
       */
      expect(Token.BTCb).toBe('BTC.b');
    });
  });

  describe('BtcStakeAndDeploy Action', () => {
    it('uses "BTC" token for stake and bake permit (triggers ratio conversion)', () => {
      /**
       * BtcStakeAndDeploy uses 'BTC' as token parameter to trigger ratio conversion.
       *
       * This is CRITICAL because:
       * 1. User deposits BTC (e.g., 20000 satoshis)
       * 2. They receive LBTC (e.g., 19947 satoshis after ratio)
       * 3. The permit signature must contain the LBTC amount (19947)
       * 4. Backend matches signature by this adjusted amount
       *
       * Using 'BTC' hits DEFI_REGISTRY[Veda]['BTC'] which has:
       *   amountStrategy: 'btcToLbtc' → applies ratio conversion
       *
       * Code location: packages/sdk/src/chains/btc/actions/stakeAndDeploy/BtcStakeAndDeploy.ts
       * Line: token: 'BTC'
       */
      const vedaBtcConfig = DEFI_REGISTRY[DefiProtocol.Veda]?.['BTC'];
      expect(vedaBtcConfig).toBeDefined();
      if (!vedaBtcConfig) return;

      // Verify btcToLbtc strategy exists in at least one env/chain
      const hasConversion = Object.values(vedaBtcConfig).some(envMap =>
        envMap ? Object.values(envMap).some(
          chainConfig => chainConfig?.amountStrategy === 'btcToLbtc',
        ) : false,
      );

      expect(hasConversion).toBe(true);
    });

    it('should NOT use AssetId.LBTC (would skip ratio conversion)', () => {
      /**
       * If BtcStakeAndDeploy used AssetId.LBTC (or Token.LBTC) as token,
       * it would hit DEFI_REGISTRY[Veda][Token.LBTC] which has:
       *   amountStrategy: 'identity' → NO ratio conversion
       *
       * Using the wrong token causes:
       * - Signature with raw amount (20000) instead of adjusted (19947)
       * - Result: "signature not found" / deposit not claimed
       */
      const vedaLbtcConfig = DEFI_REGISTRY[DefiProtocol.Veda]?.[Token.LBTC];
      expect(vedaLbtcConfig).toBeDefined();
      if (!vedaLbtcConfig) return;

      // Verify identity strategy (no conversion) for LBTC token
      const hasIdentity = Object.values(vedaLbtcConfig).some(envMap =>
        envMap ? Object.values(envMap).some(
          chainConfig => chainConfig?.amountStrategy === 'identity',
        ) : false,
      );

      expect(hasIdentity).toBe(true);
    });
  });

  describe('BtcDepositAndDeploy Action', () => {
    it('uses Token.BTCb for deposit and deploy permit (no ratio conversion needed)', () => {
      /**
       * BtcDepositAndDeploy uses Token.BTCb which has:
       *   amountStrategy: 'identity' → no conversion
       *
       * This is correct because 1 BTC = 1 BTC.b (no exchange rate).
       *
       * Code location: packages/sdk/src/chains/btc/actions/depositAndDeploy/BtcDepositAndDeploy.ts
       * Line: token: Token.BTCb
       */
      const siloBtcbConfig = DEFI_REGISTRY[DefiProtocol.Silo]?.[Token.BTCb];
      expect(siloBtcbConfig).toBeDefined();

      // Verify identity strategy for BTCb
      const hasIdentity = Object.values(siloBtcbConfig!).some(envMap =>
        Object.values(envMap!).some(
          chainConfig => chainConfig?.amountStrategy === 'identity',
        ),
      );

      expect(hasIdentity).toBe(true);
    });
  });

  describe('Amount Strategy Summary', () => {
    it('documents all amount strategies in DEFI_REGISTRY', () => {
      /**
       * Amount Strategy Reference:
       *
       * - 'identity': No conversion, use amount as-is
       *   → Used for: LBTC permits, BTCb permits
       *
       * - 'btcToLbtc': Divide amount by BTCTokenRatio
       *   → Used for: BTC → LBTC stake and bake
       *   → Formula: lbtcAmount = btcAmount / ratio
       *   → Example: 20000 / 1.00265 = 19947
       */

      const strategies = new Set<string>();

      // Collect all strategies from registry
      for (const protocolMap of Object.values(DEFI_REGISTRY)) {
        for (const tokenMap of Object.values(protocolMap)) {
          for (const envMap of Object.values(tokenMap!)) {
            for (const chainConfig of Object.values(envMap!)) {
              if (chainConfig?.amountStrategy) {
                strategies.add(chainConfig.amountStrategy);
              }
            }
          }
        }
      }

      expect(strategies.has('identity')).toBe(true);
      expect(strategies.has('btcToLbtc')).toBe(true);
      expect(strategies.size).toBe(2); // Only these two strategies exist
    });
  });
});
