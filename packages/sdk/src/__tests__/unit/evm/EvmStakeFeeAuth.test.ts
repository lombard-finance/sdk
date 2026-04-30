/**
 * EVM Stake Fee Authorization Tests
 *
 * Tests the fee authorization flow for BTC.b → LBTC staking on EVM chains.
 *
 * Fee authorization is required on unsubsidized chains (Ethereum, Sepolia).
 * On subsidized chains (Avalanche, Base, BSC), no fee auth is required.
 *
 * @module __tests__/unit/evm/EvmStakeFeeAuth.test.ts
 */

import { Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EvmStake } from '../../../chains/evm/actions/stake/EvmStake';
import * as feeAuthModule from '../../../chains/evm/shared/feeAuth';
import { PartnerConfiguration } from '../../../client/PartnerConfiguration';
import { AssetId, Chain } from '../../../core';
import { EvmOperationStatus } from '../../../shared/constants/statusConstants';
import type { EvmCoreContext } from '../../../shared/context/types';

// Mock the token functions to avoid contract address lookups
vi.mock('../../../tokens/tokens', () => ({
  getTokenContractInfo: vi.fn().mockResolvedValue({
    address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    abi: [] }) }));

vi.mock('../../../contract-functions/approveToken', () => ({
  getTokenAllowance: vi.fn().mockResolvedValue(new BigNumber('1000')), // Sufficient allowance
  approveToken: vi.fn().mockResolvedValue('0xtxhash') }));

// Spy on the fee authorization functions
vi.spyOn(feeAuthModule, 'checkFeeAuthorization');
vi.spyOn(feeAuthModule, 'authorizeFee');

const mockProvider = {
  request: vi.fn(async ({ method }: { method: string }) => {
    if (method === 'eth_accounts') {
      return ['0x0000000000000000000000000000000000000002'];
    }
    return [];
  }) };

function createContext(): EvmCoreContext {
  return {
    env: Env.prod,
    partner: new PartnerConfiguration(undefined),
    getProvider: async () => mockProvider,
    evm: {} as EvmCoreContext['evm'] };
}

describe('EvmStake Fee Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Subsidized Chains (no fee auth required)', () => {
    it('should transition directly to READY on Base (no approval, no fee auth)', async () => {
      // Base doesn't require approval, and is subsidized (no fee auth)
      vi.mocked(feeAuthModule.checkFeeAuthorization).mockResolvedValueOnce({
        requiresAuth: false,
        hasValidSignature: false,
        feeInSatoshis: null,
        feeFormatted: null,
        expirationDate: null });

      const ctx = createContext();
      const stake = new EvmStake(ctx, {
        assetIn: AssetId.BTCb,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.BASE,
        destChain: Chain.BASE });

      await stake.prepare({ amount: '0.5' });

      expect(stake.status).toBe(EvmOperationStatus.READY);
      expect(stake.feeAuth.requiresAuth).toBe(false);
    });
  });

  describe('Unsubsidized Chains (fee auth required)', () => {
    it('should transition to NEEDS_FEE_AUTHORIZATION on Ethereum when no signature exists', async () => {
      vi.mocked(feeAuthModule.checkFeeAuthorization).mockResolvedValueOnce({
        requiresAuth: true,
        hasValidSignature: false,
        feeInSatoshis: BigInt(32),
        feeFormatted: '0.00000032',
        expirationDate: null });

      const ctx = createContext();
      const stake = new EvmStake(ctx, {
        assetIn: AssetId.BTCb,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.ETHEREUM,
        destChain: Chain.ETHEREUM });

      await stake.prepare({ amount: '0.5' });

      expect(stake.status).toBe(EvmOperationStatus.NEEDS_FEE_AUTHORIZATION);
      expect(stake.feeAuth.requiresAuth).toBe(true);
      expect(stake.feeAuth.isAuthorized).toBe(false);
      expect(stake.feeAuth.feeFormatted).toBe('0.00000032');
    });

    it('should skip fee auth when valid signature exists on Ethereum', async () => {
      vi.mocked(feeAuthModule.checkFeeAuthorization).mockResolvedValueOnce({
        requiresAuth: true,
        hasValidSignature: true,
        feeInSatoshis: null,
        feeFormatted: null,
        expirationDate: '1737331200', // Some future timestamp
      });

      const ctx = createContext();
      const stake = new EvmStake(ctx, {
        assetIn: AssetId.BTCb,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.ETHEREUM,
        destChain: Chain.ETHEREUM });

      await stake.prepare({ amount: '0.5' });

      expect(stake.status).toBe(EvmOperationStatus.READY);
      expect(stake.feeAuth.requiresAuth).toBe(true);
      expect(stake.feeAuth.isAuthorized).toBe(true);
    });

    it('should transition to READY after authorizeFee', async () => {
      vi.mocked(feeAuthModule.checkFeeAuthorization).mockResolvedValueOnce({
        requiresAuth: true,
        hasValidSignature: false,
        feeInSatoshis: BigInt(32),
        feeFormatted: '0.00000032',
        expirationDate: null });
      vi.mocked(feeAuthModule.authorizeFee).mockResolvedValueOnce({
        signature: '0xabc123' as `0x${string}`,
        typedData: '{}' });

      const ctx = createContext();
      const stake = new EvmStake(ctx, {
        assetIn: AssetId.BTCb,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.ETHEREUM,
        destChain: Chain.ETHEREUM });

      await stake.prepare({ amount: '0.5' });
      expect(stake.status).toBe(EvmOperationStatus.NEEDS_FEE_AUTHORIZATION);

      await stake.authorizeFee();
      expect(stake.status).toBe(EvmOperationStatus.READY);
      expect(stake.feeAuth.isAuthorized).toBe(true);
    });
  });

  describe('FeeAuth State', () => {
    it('should expose fee information for UI display', async () => {
      vi.mocked(feeAuthModule.checkFeeAuthorization).mockResolvedValueOnce({
        requiresAuth: true,
        hasValidSignature: false,
        feeInSatoshis: BigInt(32),
        feeFormatted: '0.00000032',
        expirationDate: null });

      const ctx = createContext();
      const stake = new EvmStake(ctx, {
        assetIn: AssetId.BTCb,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.ETHEREUM,
        destChain: Chain.ETHEREUM });

      await stake.prepare({ amount: '0.5' });

      expect(stake.feeAuth.feeInSatoshis).toBe(BigInt(32));
      expect(stake.feeAuth.feeFormatted).toBe('0.00000032');
    });
  });
});
