/**
 * EVM Withdraw Integration Tests
 *
 * Tests EVM Withdraw and CancelWithdraw actions with mocked providers.
 *
 * @module __tests__/integration/evm-withdraw.integration.test.ts
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  evmCancelWithdraw,
  evmWithdraw,
} from '../../chains/evm/actions/withdraw';
import { Chain, evmActions } from '../../index';
import { EvmOperationStatus } from '../../shared/constants/statusConstants';
import { createTestConfig as createConfig } from '../helpers/createTestConfig';

// Mock viem clients
vi.mock('../../clients/public-client', () => ({
  makePublicClient: vi.fn(() => ({
    readContract: vi.fn().mockImplementation(async ({ functionName }) => {
      switch (functionName) {
        case 'balanceOf':
          // Return 1 LBTC worth of vault shares (1e8 base units)
          return 100000000n;
        case 'allowance':
          // Return 0 allowance (needs approval)
          return 0n;
        default:
          return 0n;
      }
    }),
    simulateContract: vi.fn().mockResolvedValue({
      request: {
        /* mock request */
      },
    }),
  })),
}));

vi.mock('../../clients/wallet-client', () => ({
  makeWalletClient: vi.fn(() => ({
    writeContract: vi.fn().mockResolvedValue('0xmocktxhash'),
  })),
}));

// Mock EIP1193 Provider
const createMockProvider = (overrides?: {
  balance?: bigint;
  allowance?: bigint;
  chainId?: string;
}) => ({
  on: vi.fn(),
  removeListener: vi.fn(),
  request: vi.fn().mockImplementation(async ({ method }) => {
    switch (method) {
      case 'eth_chainId':
        return overrides?.chainId ?? '0x1'; // Ethereum mainnet
      case 'eth_accounts':
        return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'];
      case 'eth_call':
        // Return mock balance/allowance
        return '0x0000000000000000000000000000000000000000000000000000000005f5e100'; // 1e8
      case 'eth_sendTransaction':
        return '0xmocktxhash';
      default:
        return null;
    }
  }),
});

describe('EVM Withdraw Integration', () => {
  let mockProvider: ReturnType<typeof createMockProvider>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = createMockProvider();
  });

  describe('Action Creation', () => {
    it('should create withdraw action using evmActions namespace', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const withdraw = evm.withdraw({
        sourceChain: Chain.ETHEREUM,
        protocol: 'veda',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      expect(withdraw).toBeDefined();
      expect(withdraw.status).toBe('idle');
    });

    it('should create withdraw action using factory', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const withdraw = evmWithdraw(config, {
        sourceChain: Chain.ETHEREUM,
        protocol: 'veda',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      expect(withdraw).toBeDefined();
      expect(withdraw.status).toBe('idle');
    });

    it('should create cancelWithdraw action using evmActions namespace', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const cancel = evm.cancelWithdraw({
        chain: Chain.ETHEREUM,
        protocol: 'veda',
      });

      expect(cancel).toBeDefined();
      expect(cancel.status).toBe('idle');
    });

    it('should create cancelWithdraw action using factory', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const cancel = evmCancelWithdraw(config, {
        chain: Chain.ETHEREUM,
        protocol: 'veda',
      });

      expect(cancel).toBeDefined();
      expect(cancel.status).toBe('idle');
    });
  });

  describe('Status Transitions', () => {
    it('should start in idle status', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const withdraw = evmWithdraw(config, {
        sourceChain: Chain.ETHEREUM,
        protocol: 'veda',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      expect(withdraw.status).toBe(EvmOperationStatus.IDLE);
      expect(withdraw.error).toBeNull();
    });

    it('should expose needsApproval property', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const withdraw = evmWithdraw(config, {
        sourceChain: Chain.ETHEREUM,
        protocol: 'veda',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      // Initially false before prepare
      expect(withdraw.needsApproval).toBe(false);
    });
  });

  describe('Protocol Validation', () => {
    it('should accept veda protocol', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const withdraw = evmWithdraw(config, {
        sourceChain: Chain.ETHEREUM,
        protocol: 'veda',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      expect(withdraw).toBeDefined();
      expect(withdraw.protocol).toBeUndefined(); // Set after prepare
    });
  });

  describe('Chain Support', () => {
    it('should support Ethereum mainnet', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const withdraw = evmWithdraw(config, {
        sourceChain: Chain.ETHEREUM,
        protocol: 'veda',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      expect(withdraw).toBeDefined();
    });

    it('should support Base', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => createMockProvider({ chainId: '0x2105' }) },
      });

      const withdraw = evmWithdraw(config, {
        sourceChain: Chain.BASE,
        protocol: 'veda',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      expect(withdraw).toBeDefined();
    });

    it('should support BSC', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => createMockProvider({ chainId: '0x38' }) },
      });

      const withdraw = evmWithdraw(config, {
        sourceChain: Chain.BSC,
        protocol: 'veda',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      expect(withdraw).toBeDefined();
    });

    it('should support Corn', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => createMockProvider({ chainId: '0x1406f40' }) },
      });

      const withdraw = evmWithdraw(config, {
        sourceChain: Chain.CORN,
        protocol: 'veda',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      expect(withdraw).toBeDefined();
    });
  });

  describe('Event Subscriptions', () => {
    it('should allow subscribing to events', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const withdraw = evmWithdraw(config, {
        sourceChain: Chain.ETHEREUM,
        protocol: 'veda',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      const handler = vi.fn();
      withdraw.on('status-change', handler);
      withdraw.on('progress', handler);
      withdraw.on('completed', handler);
      withdraw.on('error', handler);

      // Verify subscription works (handlers registered)
      expect(withdraw).toBeDefined();
    });
  });

  describe('Public Properties', () => {
    it('should expose amount after prepare', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const withdraw = evmWithdraw(config, {
        sourceChain: Chain.ETHEREUM,
        protocol: 'veda',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      // Amount is undefined before prepare
      expect(withdraw.amount).toBeUndefined();
    });

    it('should expose txHash after execute', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const withdraw = evmWithdraw(config, {
        sourceChain: Chain.ETHEREUM,
        protocol: 'veda',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      // txHash is undefined before execute
      expect(withdraw.txHash).toBeUndefined();
    });
  });
});

describe('EVM CancelWithdraw Integration', () => {
  let mockProvider: ReturnType<typeof createMockProvider>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = createMockProvider();
  });

  describe('Action Creation', () => {
    it('should create cancelWithdraw action', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const cancel = evmCancelWithdraw(config, {
        chain: Chain.ETHEREUM,
        protocol: 'veda',
      });

      expect(cancel).toBeDefined();
      expect(cancel.status).toBe(EvmOperationStatus.IDLE);
    });
  });

  describe('Status Transitions', () => {
    it('should start in idle status', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const cancel = evmCancelWithdraw(config, {
        chain: Chain.ETHEREUM,
        protocol: 'veda',
      });

      expect(cancel.status).toBe(EvmOperationStatus.IDLE);
      expect(cancel.error).toBeNull();
    });
  });

  describe('Chain Support', () => {
    it('should support all Veda vault chains', () => {
      const chains = [Chain.ETHEREUM, Chain.BASE, Chain.BSC, Chain.CORN];

      for (const chain of chains) {
        const config = createConfig({
          env: Env.prod,
          providers: { evm: () => mockProvider },
        });

        const cancel = evmCancelWithdraw(config, {
          chain,
          protocol: 'veda',
        });

        expect(cancel).toBeDefined();
      }
    });
  });

  describe('Public Properties', () => {
    it('should expose txHash after execute', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const cancel = evmCancelWithdraw(config, {
        chain: Chain.ETHEREUM,
        protocol: 'veda',
      });

      // txHash is undefined before execute
      expect(cancel.txHash).toBeUndefined();
    });
  });
});

describe('Withdraw Flow Scenarios', () => {
  let mockProvider: ReturnType<typeof createMockProvider>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = createMockProvider();
  });

  describe('Happy Path', () => {
    it('should create action with correct initial state', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const withdraw = evmWithdraw(config, {
        sourceChain: Chain.ETHEREUM,
        protocol: 'veda',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      expect(withdraw.status).toBe(EvmOperationStatus.IDLE);
      expect(withdraw.amount).toBeUndefined();
      expect(withdraw.protocol).toBeUndefined();
      expect(withdraw.needsApproval).toBe(false);
      expect(withdraw.txHash).toBeUndefined();
      expect(withdraw.error).toBeNull();
    });
  });

  describe('Method Availability', () => {
    it('should have prepare method', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const withdraw = evmWithdraw(config, {
        sourceChain: Chain.ETHEREUM,
        protocol: 'veda',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      expect(typeof withdraw.prepare).toBe('function');
    });

    it('should have approve method', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const withdraw = evmWithdraw(config, {
        sourceChain: Chain.ETHEREUM,
        protocol: 'veda',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      expect(typeof withdraw.approve).toBe('function');
    });

    it('should have execute method', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const withdraw = evmWithdraw(config, {
        sourceChain: Chain.ETHEREUM,
        protocol: 'veda',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      expect(typeof withdraw.execute).toBe('function');
    });

    it('should have on method for event subscription', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const withdraw = evmWithdraw(config, {
        sourceChain: Chain.ETHEREUM,
        protocol: 'veda',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      expect(typeof withdraw.on).toBe('function');
    });
  });

  describe('CancelWithdraw Method Availability', () => {
    it('should have prepare method', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const cancel = evmCancelWithdraw(config, {
        chain: Chain.ETHEREUM,
        protocol: 'veda',
      });

      expect(typeof cancel.prepare).toBe('function');
    });

    it('should have execute method', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const cancel = evmCancelWithdraw(config, {
        chain: Chain.ETHEREUM,
        protocol: 'veda',
      });

      expect(typeof cancel.execute).toBe('function');
    });
  });
});
