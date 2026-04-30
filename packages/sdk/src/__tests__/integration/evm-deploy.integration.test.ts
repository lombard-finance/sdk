/**
 * EVM Deploy Integration Tests
 *
 * Tests EVM Deploy action with mocked API responses.
 *
 * @module __tests__/integration/evm-deploy.integration.test.ts
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach,describe, expect, it, vi } from 'vitest';

import { evmDeploy } from '../../chains/evm/actions/deploy';
import { AssetId, Chain, evmActions } from '../../index';
import { createTestConfig as createConfig } from '../helpers/createTestConfig';

// Mock EIP1193 Provider
const createMockProvider = () => ({
  // EIP-1193 event methods required by the EvmProvider type
  on: vi.fn(),
  removeListener: vi.fn(),
  request: vi.fn().mockImplementation(async ({ method }) => {
    switch (method) {
      case 'eth_chainId':
        return '0x1'; // Ethereum mainnet
      case 'eth_accounts':
        return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'];
      case 'eth_call':
        // Mock balance/allowance calls
        return '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000'; // 1e18
      case 'eth_sendTransaction':
        return '0xmocktxhash';
      default:
        return null;
    }
  }) });

describe('EVM Deploy Integration', () => {
  let mockProvider: ReturnType<typeof createMockProvider>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = createMockProvider();
  });

  describe('Action Creation', () => {
    it('should create deploy action using evmActions namespace', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider } });

      const evm = evmActions(config);
      const deploy = evm.deploy({
        asset: AssetId.LBTC,
        sourceChain: Chain.ETHEREUM,
        protocol: 'veda',  // Use Veda protocol from DefiRegistry
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0' });

      expect(deploy).toBeDefined();
      expect(deploy.status).toBe('idle');
    });

    it('should create deploy action using factory', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider } });

      const deploy = evmDeploy(config, {
        asset: AssetId.LBTC,
        sourceChain: Chain.ETHEREUM,
        protocol: 'veda',  // Use Veda protocol from DefiRegistry
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0' });

      expect(deploy).toBeDefined();
      expect(deploy.status).toBe('idle');
    });
  });

  describe('Status Transitions', () => {
    it('should start in idle status', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider } });

      const deploy = evmDeploy(config, {
        asset: AssetId.LBTC,
        sourceChain: Chain.ETHEREUM,
        protocol: 'veda',  // Use Veda protocol from DefiRegistry
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0' });

      expect(deploy.status).toBe('idle');
      expect(deploy.isLoading).toBe(false);
      expect(deploy.error).toBeNull();
    });
  });

  describe('Protocol Validation', () => {
    it('should accept valid protocols', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider } });

      // This should not throw
      const deploy = evmDeploy(config, {
        asset: AssetId.LBTC,
        sourceChain: Chain.ETHEREUM,
        protocol: 'veda',  // Use Veda protocol from DefiRegistry
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0' });

      expect(deploy).toBeDefined();
    });
  });
});

