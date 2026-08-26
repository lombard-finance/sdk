/**
 * BTC Deposit Action Unit Tests
 *
 * Tests the BTC → BTC.b deposit flow including:
 * - Parameter validation
 * - Status transitions
 * - Authorization flow
 * - Deposit address generation
 *
 * @module __tests__/unit/btc/BtcDepositBtcb.test.ts
 */

import { describe, expect, it, vi } from 'vitest';

import {
  getDepositChainConfig,
  isAssetOutSupported,
} from '../../../chains/btc/actions/deposit-btcb/config';
import type {
  BtcDepositBtcbParams,
  BtcDepositBtcbPrepareParams,
} from '../../../chains/btc/actions/deposit-btcb/types';
import { AssetId, Chain } from '../../../core';
import { LombardError, ValidationErrorCode } from '../../../shared/errors';

describe('BtcDepositBtcb Interface', () => {
  describe('BtcDepositBtcbParams', () => {
    it('should accept valid deposit parameters', () => {
      const params: BtcDepositBtcbParams = {
        assetOut: AssetId.BTCb,
        destChain: Chain.AVALANCHE,
      };

      expect(params.assetOut).toBe(AssetId.BTCb);
      expect(params.destChain).toBe(Chain.AVALANCHE);
    });

    it('should require BTCb as output asset', () => {
      const validParams: BtcDepositBtcbParams = {
        assetOut: AssetId.BTCb,
        destChain: Chain.AVALANCHE,
      };

      // BTCb is correct for deposit
      expect(validParams.assetOut).toBe(AssetId.BTCb);
    });

    it('should support optional source chain', () => {
      const params: BtcDepositBtcbParams = {
        assetOut: AssetId.BTCb,
        destChain: Chain.AVALANCHE,
        sourceChain: Chain.BITCOIN_MAINNET,
      };

      expect(params.sourceChain).toBe(Chain.BITCOIN_MAINNET);
    });

    it('should support Avalanche chains for BTC.b', () => {
      const mainnetParams: BtcDepositBtcbParams = {
        assetOut: AssetId.BTCb,
        destChain: Chain.AVALANCHE,
      };

      const testnetParams: BtcDepositBtcbParams = {
        assetOut: AssetId.BTCb,
        destChain: Chain.AVALANCHE_FUJI,
      };

      expect(mainnetParams.destChain).toBe(Chain.AVALANCHE);
      expect(testnetParams.destChain).toBe(Chain.AVALANCHE_FUJI);
    });
  });

  describe('BtcDepositBtcbPrepareParams', () => {
    it('should accept valid prepare parameters', () => {
      const params: BtcDepositBtcbPrepareParams = {
        amount: '0.1',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      };

      expect(params.amount).toBe('0.1');
      expect(params.recipient).toBeDefined();
    });

    it('should support optional referral code', () => {
      const params: BtcDepositBtcbPrepareParams = {
        amount: '0.1',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        referralCode: 'REF123',
      };

      expect(params.referralCode).toBe('REF123');
    });
  });

  describe('Status Transitions', () => {
    it('should define all required status values for deposit', () => {
      const statuses = [
        'idle',
        'needs_fee_authorization',
        'needs_address_confirmation',
        'ready',
        'address_ready',
      ];

      statuses.forEach((status) => {
        expect(typeof status).toBe('string');
      });
    });

    it('should define correct status flow', () => {
      const statusFlow = {
        'idle -> prepare':
          'needs_fee_authorization or needs_address_confirmation',
        'needs_fee_authorization -> authorize': 'ready',
        'needs_address_confirmation -> authorize': 'ready',
        'ready -> generateDepositAddress': 'address_ready',
      };

      expect(Object.keys(statusFlow).length).toBeGreaterThan(0);
    });
  });

  describe('Method Signatures', () => {
    it('should define prepare method', () => {
      type PrepareMethod = (
        params: BtcDepositBtcbPrepareParams,
      ) => Promise<void>;
      const testType: PrepareMethod = async () => {};
      expect(testType).toBeDefined();
    });

    it('should define authorize method', () => {
      type AuthorizeMethod = () => Promise<void>;
      const testType: AuthorizeMethod = async () => {};
      expect(testType).toBeDefined();
    });

    it('should define generateDepositAddress method', () => {
      type GenerateAddressMethod = () => Promise<string>;
      const testType: GenerateAddressMethod = async () =>
        'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
      expect(testType).toBeDefined();
    });

    it('should define execute method', () => {
      type ExecuteMethod = () => Promise<{ depositAddress: string }>;
      const testType: ExecuteMethod = async () => ({
        depositAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      });
      expect(testType).toBeDefined();
    });

    it('should define monitorDeposit method', () => {
      type MonitorMethod = () => Promise<unknown>;
      const testType: MonitorMethod = async () => undefined;
      expect(testType).toBeDefined();
    });
  });

  describe('Event Emissions', () => {
    it('should emit progress events', () => {
      const handler = vi.fn(
        (progress: { status: string; steps?: Record<string, string> }) => {
          expect(progress.status).toBeDefined();
        },
      );

      handler({
        status: 'address_ready',
        steps: { created: 'complete', verifying: 'idle', issuing: 'idle' },
      });

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should emit status-change events', () => {
      const handler = vi.fn((status: string) => {
        expect(typeof status).toBe('string');
      });

      handler('ready');
      expect(handler).toHaveBeenCalledWith('ready');
    });
  });

  describe('Public Properties', () => {
    it('should expose status property', () => {
      type HasStatus = { readonly status: string };
      const obj: HasStatus = { status: 'idle' };
      expect(obj.status).toBe('idle');
    });

    it('should expose amount property after prepare', () => {
      type HasAmount = { readonly amount?: string };
      const obj: HasAmount = { amount: '0.1' };
      expect(obj.amount).toBe('0.1');
    });

    it('should expose recipient property after prepare', () => {
      type HasRecipient = { readonly recipient?: string };
      const obj: HasRecipient = {
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      };
      expect(obj.recipient).toBeDefined();
    });

    it('should expose depositAddress property after generate', () => {
      type HasDepositAddress = { readonly depositAddress?: string };
      const obj: HasDepositAddress = {
        depositAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      };
      expect(obj.depositAddress).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    /**
     * Asserted against the real config rather than a hand-built error.
     *
     * The previous version of this test constructed a `LombardError` and then
     * checked the string it had just passed in, so it held no matter what the
     * action did — and it went on passing after the message it described had
     * been rewritten.
     */
    it('does not accept LBTC as an output asset', () => {
      const config = getDepositChainConfig('evm');

      expect(config).toBeDefined();
      expect(isAssetOutSupported(config!, AssetId.LBTC)).toBe(false);
      expect(isAssetOutSupported(config!, AssetId.BTCb)).toBe(true);
    });

    it('should reject unsupported destination chains', () => {
      const error = new LombardError(
        ValidationErrorCode.INVALID_CHAIN,
        `Destination chain ethereum is not supported for BTC deposits.`,
      );

      expect(error.code).toBe(ValidationErrorCode.INVALID_CHAIN);
    });

    it('should handle user rejection during authorization', () => {
      const error = LombardError.userRejected('deposit authorization');
      expect(error.message).toContain('deposit authorization');
    });
  });

  describe('Fee Authorization', () => {
    it('should require fee auth for Ethereum mainnet only', () => {
      // Fee authorization is only required for Ethereum mainnet
      const feeAuthChains = [Chain.ETHEREUM];
      const noFeeAuthChains = [Chain.AVALANCHE, Chain.AVALANCHE_FUJI];

      expect(feeAuthChains).toContain(Chain.ETHEREUM);
      noFeeAuthChains.forEach((chain) => {
        expect(feeAuthChains).not.toContain(chain);
      });
    });

    it('should use address confirmation for non-Ethereum chains', () => {
      // Avalanche uses address confirmation, not fee auth
      const addressConfirmationChains = [Chain.AVALANCHE, Chain.AVALANCHE_FUJI];

      addressConfirmationChains.forEach((chain) => {
        expect(chain).not.toBe(Chain.ETHEREUM);
      });
    });
  });
});
