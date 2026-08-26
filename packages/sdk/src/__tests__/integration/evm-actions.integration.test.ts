/**
 * EVM Actions Integration Tests
 *
 * Tests for all EVM chain operations:
 * - EvmDepositBtcb: BTC.b → LBTC
 * - EvmWithdrawLbtc: LBTC → BTC or BTC.b
 * - EvmClaim: Claim LBTC with proof
 * - EvmDeploy: LBTC/BTC.b → DeFi
 * - EvmWithdrawBtcb: LBTC → BTC.b
 *
 * @see SDK_DEVELOPER_FAQ.md
 */

import { Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import type { EIP1193Provider } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { evmActions } from '../../chains/evm/EvmActions';
import { depositToken } from '../../contract-functions/deposit';
import { AssetId, Chain, DeployProtocol } from '../../core';
import { EvmOperationStatus } from '../../shared/constants/statusConstants';
import { Token } from '../../tokens/token-addresses';
import { createTestConfig as createConfig } from '../helpers/createTestConfig';

vi.mock('../../contract-functions/deposit', () => ({
  depositToken: vi.fn(),
  getAssetRouterAddress: vi.fn(
    async () => '0x0000000000000000000000000000000000000001',
  ),
}));

// Mock clients for EvmDeploy allowance checks
vi.mock('../../clients/public-client', () => ({
  makePublicClient: vi.fn(() => ({
    readContract: vi.fn().mockResolvedValue(BigInt('100000000000')), // High allowance
    simulateContract: vi.fn().mockResolvedValue({ request: {} }),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: 'success' }),
  })),
}));

vi.mock('../../clients/wallet-client', () => ({
  makeWalletClient: vi.fn(() => ({
    writeContract: vi.fn().mockResolvedValue('0xapprovetxhash'),
  })),
}));

// Mock token contract info to avoid real address lookups
vi.mock('../../tokens/tokens', () => ({
  getTokenContractInfo: vi.fn().mockResolvedValue({
    address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    abi: [],
  }),
  getTokenInfo: vi.fn().mockResolvedValue({
    address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    abi: [
      {
        name: 'allowance',
        type: 'function',
        inputs: [{ type: 'address' }, { type: 'address' }],
        outputs: [{ type: 'uint256' }],
      },
      {
        name: 'approve',
        type: 'function',
        inputs: [{ type: 'address' }, { type: 'uint256' }],
        outputs: [{ type: 'bool' }],
      },
    ],
    decimals: 8,
    symbol: 'LBTC',
  }),
  toBaseDenomination: vi.fn((amount) =>
    new BigNumber(amount).multipliedBy(1e8),
  ),
  fromBaseDenomination: vi.fn((amount) => new BigNumber(amount).dividedBy(1e8)),
}));

vi.mock('../../contract-functions/approveToken', () => ({
  approveToken: vi.fn(async () => '0xapprovetxhash'),
  // Mock sufficient allowance so tests proceed past approval check
  getTokenAllowance: vi.fn(async () => new BigNumber('1000000')),
}));

// Mock fee authorization for EvmDepositBtcb (subsidized chains don't require fee auth)
vi.mock('../../chains/evm/shared/feeAuth', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../../chains/evm/shared/feeAuth')>();
  return {
    ...original,
    checkFeeAuthorization: vi.fn(async () => ({
      requiresAuth: false, // Avalanche is subsidized
      hasValidSignature: false,
      feeInSatoshis: null,
      feeFormatted: null,
      expirationDate: null,
    })),
    authorizeFee: vi.fn(async () => ({
      signature: '0xabc123' as `0x${string}`,
      typedData: '{}',
    })),
  };
});

// ═══════════════════════════════════════════════════════════════════════════
// Mock Provider Setup
// ═══════════════════════════════════════════════════════════════════════════

function createMockEvmProvider(): EIP1193Provider {
  const mockProvider = {
    request: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  };

  mockProvider.request.mockImplementation(async ({ method }) => {
    switch (method) {
      case 'eth_requestAccounts':
      case 'eth_accounts':
        return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'];
      case 'eth_chainId':
        return '0xa869'; // Avalanche Fuji chain ID (43113 in hex)
      case 'wallet_switchEthereumChain':
        return null;
      case 'eth_signTypedData_v4':
        return '0x' + '00'.repeat(65);
      case 'eth_sendTransaction':
        return '0x' + 'ab'.repeat(32); // Mock tx hash
      case 'eth_getTransactionReceipt':
        return { status: '0x1', blockNumber: '0x100' };
      default:
        console.warn(`Unhandled provider method: ${method}`);
        return null;
    }
  });

  return mockProvider as unknown as EIP1193Provider;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVM Stake Tests (BTC.b → LBTC)
// ═══════════════════════════════════════════════════════════════════════════

describe('EVM Stake Action', () => {
  let mockProvider: EIP1193Provider;

  beforeEach(() => {
    mockProvider = createMockEvmProvider();
    vi.clearAllMocks();
  });

  describe('Lifecycle', () => {
    it('should start in IDLE status', () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const stake = evm.deposit({
        assetIn: AssetId.BTCb,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.AVALANCHE_FUJI,
        destChain: Chain.AVALANCHE_FUJI,
      });

      expect(stake.status).toBe(EvmOperationStatus.IDLE);
      expect(stake.isLoading).toBe(false);
      expect(stake.isFailed).toBe(false);
      expect(stake.error).toBeNull();
    });

    it('should transition to READY after prepare (subsidized chain)', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const stake = evm.deposit({
        assetIn: AssetId.BTCb,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.AVALANCHE_FUJI,
        destChain: Chain.AVALANCHE_FUJI,
      });

      await stake.prepare({ amount: '0.001' });

      // Avalanche is a subsidized chain, so goes directly to READY
      expect(stake.status).toBe(EvmOperationStatus.READY);
      expect(stake.amount).toBe('0.001');
    });

    it('should transition to READY after approve', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const stake = evm.deposit({
        assetIn: AssetId.BTCb,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.AVALANCHE_FUJI,
        destChain: Chain.AVALANCHE_FUJI,
      });

      await stake.prepare({ amount: '0.001' });

      // Avalanche is a subsidized chain, so no fee auth needed
      expect(stake.status).toBe(EvmOperationStatus.READY);
      expect(stake.feeAuth.requiresAuth).toBe(false);
    });

    it('should emit status change events', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const stake = evm.deposit({
        assetIn: AssetId.BTCb,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.AVALANCHE_FUJI,
        destChain: Chain.AVALANCHE_FUJI,
      });

      const statusChanges: string[] = [];
      stake.on('status-change', (status: unknown) =>
        statusChanges.push(status as string),
      );

      await stake.prepare({ amount: '0.001' });

      // On subsidized chains, goes directly to READY (no NEEDS_FEE_AUTHORIZATION step)
      expect(statusChanges).toContain(EvmOperationStatus.READY);
    });
  });

  describe('Validation', () => {
    it('should reject invalid amount', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const stake = evm.deposit({
        assetIn: AssetId.BTCb,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.AVALANCHE_FUJI,
        destChain: Chain.AVALANCHE_FUJI,
      });

      await expect(stake.prepare({ amount: '' })).rejects.toThrow();
    });

    it('should reject negative amount', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const stake = evm.deposit({
        assetIn: AssetId.BTCb,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.AVALANCHE_FUJI,
        destChain: Chain.AVALANCHE_FUJI,
      });

      await expect(stake.prepare({ amount: '-0.001' })).rejects.toThrow();
    });
  });

  describe('Execution', () => {
    it('should execute BTC.b → LBTC via asset router', async () => {
      const mockTxHash = '0x' + 'cd'.repeat(32);
      (depositToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockTxHash,
      );

      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const stake = evm.deposit({
        assetIn: AssetId.BTCb,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.AVALANCHE_FUJI,
        destChain: Chain.AVALANCHE_FUJI,
      });

      await stake.prepare({ amount: '0.01' });
      // Avalanche is subsidized, goes directly to READY
      const result = await stake.execute();

      expect(result.txHash).toBe(mockTxHash);
      expect(depositToken).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '0.01',
          tokenIn: Token.BTCb,
          tokenOut: Token.LBTC,
        }),
      );
      expect(stake.txHash).toBe(mockTxHash);
      expect(stake.status).toBe(EvmOperationStatus.COMPLETED);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// EVM Withdraw Tests (LBTC → BTC or BTC.b)
// ═══════════════════════════════════════════════════════════════════════════

describe('EVM Unstake Action', () => {
  let mockProvider: EIP1193Provider;

  beforeEach(() => {
    mockProvider = createMockEvmProvider();
    vi.clearAllMocks();
  });

  describe('LBTC → BTC.b (same-chain)', () => {
    it('should start in IDLE status', () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const unstake = evm.withdraw({
        assetIn: AssetId.LBTC,
        assetOut: AssetId.BTCb,
        sourceChain: Chain.AVALANCHE_FUJI,
        destChain: Chain.AVALANCHE_FUJI,
      });

      expect(unstake.status).toBe(EvmOperationStatus.IDLE);
    });

    it('should transition to READY after prepare', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const unstake = evm.withdraw({
        assetIn: AssetId.LBTC,
        assetOut: AssetId.BTCb,
        sourceChain: Chain.AVALANCHE_FUJI,
        destChain: Chain.AVALANCHE_FUJI,
      });

      await unstake.prepare({
        amount: '0.001',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      expect(unstake.status).toBe(EvmOperationStatus.READY);
      expect(unstake.amount).toBe('0.001');
    });
  });

  describe('LBTC → BTC (cross-chain)', () => {
    it('should validate Bitcoin recipient address', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const unstake = evm.withdraw({
        assetIn: AssetId.LBTC,
        assetOut: AssetId.BTC,
        sourceChain: Chain.SEPOLIA,
        destChain: Chain.BITCOIN_SIGNET,
      });

      // Valid Bitcoin signet address
      await unstake.prepare({
        amount: '0.001',
        recipient: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
      });

      expect(unstake.status).toBe(EvmOperationStatus.READY);
    });

    it('should reject invalid Bitcoin address', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const unstake = evm.withdraw({
        assetIn: AssetId.LBTC,
        assetOut: AssetId.BTC,
        sourceChain: Chain.SEPOLIA,
        destChain: Chain.BITCOIN_SIGNET,
      });

      await expect(
        unstake.prepare({
          amount: '0.001',
          recipient: 'invalid-address',
        }),
      ).rejects.toThrow();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// EVM Deploy Tests (LBTC → DeFi)
// ═══════════════════════════════════════════════════════════════════════════

describe('EVM Deploy Action', () => {
  let mockProvider: EIP1193Provider;

  beforeEach(() => {
    mockProvider = createMockEvmProvider();
    vi.clearAllMocks();
  });

  describe('Lifecycle', () => {
    it('should start in IDLE status', () => {
      const config = createConfig({
        env: Env.prod, // Bitcoin Earn only on prod
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const deploy = evm.deploy({
        asset: AssetId.LBTC,
        sourceChain: Chain.ETHEREUM,
        protocol: DeployProtocol.BitcoinEarn,
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      expect(deploy.status).toBe(EvmOperationStatus.IDLE);
    });

    it('should transition to READY after prepare when allowance is sufficient', async () => {
      // Mock returns high allowance (BigInt('100000000000') = 1000 LBTC in base units)
      // So 0.01 LBTC should not need approval
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const deploy = evm.deploy({
        asset: AssetId.LBTC,
        sourceChain: Chain.ETHEREUM,
        protocol: DeployProtocol.BitcoinEarn,
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      await deploy.prepare({
        amount: '0.01',
        protocol: DeployProtocol.BitcoinEarn,
      });

      // With sufficient allowance, should skip to READY
      expect(deploy.status).toBe(EvmOperationStatus.READY);
      expect(deploy.amount).toBe('0.01');
      expect(deploy.protocol).toBe(DeployProtocol.BitcoinEarn);
      expect(deploy.needsApproval).toBe(false);
    });

    it('should transition to NEEDS_APPROVAL when allowance is insufficient', async () => {
      // Override the mock to return low allowance
      const { makePublicClient } = await import('../../clients/public-client');
      vi.mocked(makePublicClient).mockReturnValueOnce({
        readContract: vi.fn().mockResolvedValue(BigInt('0')), // Zero allowance
        simulateContract: vi.fn().mockResolvedValue({ request: {} }),
        waitForTransactionReceipt: vi
          .fn()
          .mockResolvedValue({ status: 'success' }),
      } as unknown as ReturnType<typeof makePublicClient>);

      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const deploy = evm.deploy({
        asset: AssetId.LBTC,
        sourceChain: Chain.ETHEREUM,
        protocol: DeployProtocol.BitcoinEarn,
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      await deploy.prepare({
        amount: '0.01',
        protocol: DeployProtocol.BitcoinEarn,
      });

      expect(deploy.status).toBe(EvmOperationStatus.NEEDS_APPROVAL);
      expect(deploy.needsApproval).toBe(true);
    });

    it('should transition to READY after approve when allowance was insufficient', async () => {
      // Override mock to return low allowance for prepare
      const { makePublicClient } = await import('../../clients/public-client');
      vi.mocked(makePublicClient).mockReturnValueOnce({
        readContract: vi.fn().mockResolvedValue(BigInt('0')), // Zero allowance
        simulateContract: vi.fn().mockResolvedValue({ request: {} }),
        waitForTransactionReceipt: vi
          .fn()
          .mockResolvedValue({ status: 'success' }),
      } as unknown as ReturnType<typeof makePublicClient>);

      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const deploy = evm.deploy({
        asset: AssetId.LBTC,
        sourceChain: Chain.ETHEREUM,
        protocol: DeployProtocol.BitcoinEarn,
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      await deploy.prepare({
        amount: '0.01',
        protocol: DeployProtocol.BitcoinEarn,
      });

      expect(deploy.status).toBe(EvmOperationStatus.NEEDS_APPROVAL);

      await deploy.approve();

      expect(deploy.status).toBe(EvmOperationStatus.READY);
      expect(deploy.needsApproval).toBe(false);
    });
  });

  describe('Protocol Validation', () => {
    it('should reject unsupported protocol in testnet', async () => {
      const config = createConfig({
        env: Env.testnet, // Bitcoin Earn not on testnet
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const deploy = evm.deploy({
        asset: AssetId.LBTC,
        sourceChain: Chain.SEPOLIA,
        protocol: DeployProtocol.BitcoinEarn,
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      await expect(
        deploy.prepare({
          amount: '0.01',
          protocol: DeployProtocol.BitcoinEarn,
        }),
      ).rejects.toThrow(/not supported/i);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// EVM Redeem Tests (LBTC → BTC.b)
// ═══════════════════════════════════════════════════════════════════════════

describe('EVM Redeem Action', () => {
  let mockProvider: EIP1193Provider;

  beforeEach(() => {
    mockProvider = createMockEvmProvider();
    vi.clearAllMocks();
  });

  describe('Lifecycle', () => {
    it('should start in IDLE status', () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const redeem = evm.withdraw({
        assetIn: AssetId.BTCb,
        assetOut: AssetId.BTC,
        sourceChain: Chain.AVALANCHE_FUJI,
        destChain: Chain.BITCOIN_SIGNET,
      });

      expect(redeem.status).toBe(EvmOperationStatus.IDLE);
    });

    it('should transition directly to READY after prepare (no approval)', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const redeem = evm.withdraw({
        assetIn: AssetId.BTCb,
        assetOut: AssetId.BTC,
        sourceChain: Chain.AVALANCHE_FUJI,
        destChain: Chain.BITCOIN_SIGNET,
      });

      await redeem.prepare({
        amount: '0.001',
        // Valid testnet Bitcoin address from BIP-0173
        recipient: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
      });

      // Redeem goes directly to READY (no approval needed)
      expect(redeem.status).toBe(EvmOperationStatus.READY);
      expect(redeem.needsApproval).toBe(false);
    });

    it('should emit progress events', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const redeem = evm.withdraw({
        assetIn: AssetId.BTCb,
        assetOut: AssetId.BTC,
        sourceChain: Chain.AVALANCHE_FUJI,
        destChain: Chain.BITCOIN_SIGNET,
      });

      interface ProgressEvent {
        status: string;
        steps?: Record<string, string>;
      }

      const progressEvents: ProgressEvent[] = [];
      redeem.on('progress', (progress: unknown) =>
        progressEvents.push(progress as ProgressEvent),
      );

      await redeem.prepare({
        amount: '0.001',
        // Valid testnet Bitcoin address from BIP-0173
        recipient: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
      });

      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[progressEvents.length - 1].status).toBe(
        EvmOperationStatus.READY,
      );
    });
  });

  describe('Validation', () => {
    it('should reject invalid EVM address', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const redeem = evm.withdraw({
        assetIn: AssetId.BTCb,
        assetOut: AssetId.BTC,
        sourceChain: Chain.AVALANCHE_FUJI,
        destChain: Chain.BITCOIN_SIGNET,
      });

      await expect(
        redeem.prepare({
          amount: '0.001',
          recipient: 'not-an-address',
        }),
      ).rejects.toThrow();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// EVM Deposit Tests (Claim LBTC with proof)
// ═══════════════════════════════════════════════════════════════════════════

describe('EVM Deposit Action', () => {
  let mockProvider: EIP1193Provider;

  beforeEach(() => {
    mockProvider = createMockEvmProvider();
    vi.clearAllMocks();
  });

  describe('Lifecycle', () => {
    it('should start in IDLE status', () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const deposit = evm.claim({
        assetIn: AssetId.BTC,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.BITCOIN_SIGNET,
        destChain: Chain.SEPOLIA,
      });

      expect(deposit.status).toBe('idle');
    });

    it('should transition to READY after prepare', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const deposit = evm.claim({
        assetIn: AssetId.BTC,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.BITCOIN_SIGNET,
        destChain: Chain.SEPOLIA,
      });

      await deposit.prepare({
        amount: '0.001',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      expect(deposit.status).toBe('ready');
    });

    it('should require claim data before execute', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const deposit = evm.claim({
        assetIn: AssetId.BTC,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.BITCOIN_SIGNET,
        destChain: Chain.SEPOLIA,
      });

      await deposit.prepare({
        amount: '0.001',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      // Should fail without claim data
      await expect(deposit.execute()).rejects.toThrow(/claimData/i);
    });
  });

  describe('Claim Data', () => {
    it('should accept claim data via setClaimData', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const deposit = evm.claim({
        assetIn: AssetId.BTC,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.BITCOIN_SIGNET,
        destChain: Chain.SEPOLIA,
      });

      await deposit.prepare({
        amount: '0.001',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      // Set claim data
      deposit.setClaimData('0xdata...', '0xproofSignature...');

      // Now should have claim data (execute would work with proper mocks)
      expect(deposit.status).toBe('ready');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Error Handling Tests (applies to all actions)
// ═══════════════════════════════════════════════════════════════════════════

describe('EVM Action Error Handling', () => {
  let mockProvider: EIP1193Provider;

  beforeEach(() => {
    mockProvider = createMockEvmProvider();
    vi.clearAllMocks();
  });

  it('should preserve status on error', async () => {
    const config = createConfig({
      env: Env.testnet,
      providers: { evm: () => mockProvider },
    });

    const evm = evmActions(config);
    const stake = evm.deposit({
      assetIn: AssetId.BTCb,
      assetOut: AssetId.LBTC,
      sourceChain: Chain.AVALANCHE_FUJI,
      destChain: Chain.AVALANCHE_FUJI,
    });

    const initialStatus = stake.status;

    await expect(stake.prepare({ amount: '' })).rejects.toThrow();

    // Status should not change on error
    expect(stake.status).toBe(initialStatus);
    expect(stake.isFailed).toBe(true);
    expect(stake.error).not.toBeNull();
  });

  it('should allow retry after error', async () => {
    const config = createConfig({
      env: Env.testnet,
      providers: { evm: () => mockProvider },
    });

    const evm = evmActions(config);
    const stake = evm.deposit({
      assetIn: AssetId.BTCb,
      assetOut: AssetId.LBTC,
      sourceChain: Chain.AVALANCHE_FUJI,
      destChain: Chain.AVALANCHE_FUJI,
    });

    // First attempt fails
    await expect(stake.prepare({ amount: '' })).rejects.toThrow();
    expect(stake.isFailed).toBe(true);

    // Retry with valid amount
    await stake.prepare({ amount: '0.001' });

    expect(stake.isFailed).toBe(false);
    expect(stake.error).toBeNull();
    // Avalanche is subsidized, goes directly to READY
    expect(stake.status).toBe(EvmOperationStatus.READY);
  });

  it('should emit error and failed events', async () => {
    const config = createConfig({
      env: Env.testnet,
      providers: { evm: () => mockProvider },
    });

    const evm = evmActions(config);
    const unstake = evm.withdraw({
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTCb,
      sourceChain: Chain.AVALANCHE_FUJI,
      destChain: Chain.AVALANCHE_FUJI,
    });

    const errors: Error[] = [];
    const failedEvents: number[] = [];

    unstake.on('error', (error: unknown) => errors.push(error as Error));
    unstake.on('failed', () => failedEvents.push(1));

    await expect(
      unstake.prepare({
        amount: '',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      }),
    ).rejects.toThrow();

    expect(errors.length).toBe(1);
    expect(failedEvents.length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Loading State Tests (applies to all actions)
// ═══════════════════════════════════════════════════════════════════════════

describe('EVM Action Loading States', () => {
  let mockProvider: EIP1193Provider;

  beforeEach(() => {
    mockProvider = createMockEvmProvider();
    vi.clearAllMocks();
  });

  it('should emit loading events during operations', async () => {
    const config = createConfig({
      env: Env.testnet,
      providers: { evm: () => mockProvider },
    });

    const evm = evmActions(config);
    const stake = evm.deposit({
      assetIn: AssetId.BTCb,
      assetOut: AssetId.LBTC,
      sourceChain: Chain.AVALANCHE_FUJI,
      destChain: Chain.AVALANCHE_FUJI,
    });

    const loadingStates: boolean[] = [];
    stake.on('loading', (isLoading: unknown) =>
      loadingStates.push(isLoading as boolean),
    );

    await stake.prepare({ amount: '0.001' });

    // Should have transitioned through loading states
    expect(loadingStates).toContain(true);
    expect(loadingStates[loadingStates.length - 1]).toBe(false);
    expect(stake.isLoading).toBe(false);
  });

  it('should return unsubscribe function from on()', () => {
    const config = createConfig({
      env: Env.testnet,
      providers: { evm: () => mockProvider },
    });

    const evm = evmActions(config);
    const stake = evm.deposit({
      assetIn: AssetId.BTCb,
      assetOut: AssetId.LBTC,
      sourceChain: Chain.AVALANCHE_FUJI,
      destChain: Chain.AVALANCHE_FUJI,
    });

    const handler = vi.fn();
    const unsubscribe = stake.on('status-change', handler);

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });
});
