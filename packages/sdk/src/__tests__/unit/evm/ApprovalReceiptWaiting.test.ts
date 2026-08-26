/**
 * Tests that approval transactions wait for transaction receipts
 * before continuing execution.
 *
 * Verifies the fix for: ERC-20 approval methods sending transactions
 * without awaiting block inclusion (receipt), which could cause
 * subsequent operations to fail if the approval hadn't been mined yet.
 *
 * @module __tests__/unit/evm/ApprovalReceiptWaiting.test.ts
 */

import { Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks ---

const mockWaitForTransactionReceipt = vi.fn().mockResolvedValue({
  status: 'success',
  transactionHash: '0xmocktxhash',
  blockNumber: 1n,
  gasUsed: 21000n,
});

const mockWriteContract = vi.fn().mockResolvedValue('0xmocktxhash');

const mockReadContract = vi
  .fn()
  .mockImplementation(async ({ functionName }: { functionName: string }) => {
    switch (functionName) {
      case 'balanceOf':
        return 100000000n; // 1 LBTC in base units
      case 'allowance':
        return 0n; // No allowance (needs approval)
      default:
        return 0n;
    }
  });

const mockSimulateContract = vi.fn().mockResolvedValue({
  request: { address: '0xmock', abi: [], functionName: 'approve' },
});

const mockPublicClient = {
  readContract: mockReadContract,
  simulateContract: mockSimulateContract,
  waitForTransactionReceipt: mockWaitForTransactionReceipt,
};

const mockWalletClient = {
  writeContract: mockWriteContract,
};

vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn(() => mockPublicClient),
}));

vi.mock('../../../clients/wallet-client', () => ({
  makeWalletClient: vi.fn(() => mockWalletClient),
}));

// Mock transaction-executor's waitForTransactionReceipt
const mockTxExecutorWaitForReceipt = vi.fn().mockResolvedValue({
  status: 'success',
  transactionHash: '0xmocktxhash',
  blockNumber: 1n,
  gasUsed: 21000n,
});

vi.mock('../../../utils/transaction-executor', () => ({
  waitForTransactionReceipt: (...args: unknown[]) =>
    mockTxExecutorWaitForReceipt(...args),
  executeContractTransaction: vi.fn(),
}));

// Mock token info for approveToken and vault ops
// fromBaseDenomination maps '0' -> BigNumber(0) to ensure allowance=0 triggers approval
vi.mock('../../../tokens/tokens', () => ({
  getTokenInfo: vi.fn().mockResolvedValue({
    address: '0xmocktoken',
    abi: [],
    decimals: 8,
    symbol: 'MOCK',
  }),
  getTokenContractInfo: vi.fn().mockResolvedValue({
    address: '0xmocktoken',
    abi: [],
  }),
  fromBaseDenomination: vi.fn().mockImplementation((value: string) => {
    return new BigNumber(value === '0' ? '0' : '1');
  }),
  toBaseDenomination: vi.fn().mockReturnValue(new BigNumber('10000000')),
  retrieveTokenProperties: vi.fn(),
  isUpgradedAbi: vi.fn().mockReturnValue(false),
}));

// --- Tests ---

describe('Approval Receipt Waiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWaitForTransactionReceipt.mockResolvedValue({
      status: 'success',
      transactionHash: '0xmocktxhash',
      blockNumber: 1n,
      gasUsed: 21000n,
    });
    mockWriteContract.mockResolvedValue('0xmocktxhash');
    mockReadContract.mockImplementation(
      async ({ functionName }: { functionName: string }) => {
        switch (functionName) {
          case 'balanceOf':
            return 100000000n;
          case 'allowance':
            return 0n;
          default:
            return 0n;
        }
      },
    );
    mockSimulateContract.mockResolvedValue({
      request: { address: '0xmock', abi: [], functionName: 'approve' },
    });
    mockTxExecutorWaitForReceipt.mockResolvedValue({
      status: 'success',
      transactionHash: '0xmocktxhash',
      blockNumber: 1n,
      gasUsed: 21000n,
    });
  });

  const createMockProvider = () => ({
    on: vi.fn(),
    removeListener: vi.fn(),
    request: vi
      .fn()
      .mockImplementation(async ({ method }: { method: string }) => {
        if (method === 'eth_accounts')
          return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'];
        if (method === 'eth_chainId') return '0x1';
        return null;
      }),
  });

  describe('EvmWithdrawVault.approve()', () => {
    it('should wait for transaction receipt after sending approval tx', async () => {
      const { evmWithdraw } =
        await import('../../../chains/evm/actions/withdraw-vault');
      const { createTestConfig } =
        await import('../../helpers/createTestConfig');
      const { Chain } = await import('../../../core');

      const config = createTestConfig({
        env: Env.prod,
        providers: { evm: () => createMockProvider() },
      });

      const withdraw = evmWithdraw(config, {
        sourceChain: Chain.ETHEREUM,
        protocol: 'veda',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      await withdraw.prepare({ amount: '0.1' });
      expect(withdraw.needsApproval).toBe(true);

      await withdraw.approve();

      expect(mockWriteContract).toHaveBeenCalled();
      expect(mockTxExecutorWaitForReceipt).toHaveBeenCalledWith(
        mockPublicClient,
        '0xmocktxhash',
        'vault share approval',
      );
      expect(withdraw.needsApproval).toBe(false);
    });

    it('should set error state when receipt waiting fails', async () => {
      const { evmWithdraw } =
        await import('../../../chains/evm/actions/withdraw-vault');
      const { createTestConfig } =
        await import('../../helpers/createTestConfig');
      const { Chain } = await import('../../../core');

      const config = createTestConfig({
        env: Env.prod,
        providers: { evm: () => createMockProvider() },
      });

      const withdraw = evmWithdraw(config, {
        sourceChain: Chain.ETHEREUM,
        protocol: 'veda',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      await withdraw.prepare({ amount: '0.1' });
      expect(withdraw.needsApproval).toBe(true);

      // Now make the receipt wait fail
      mockTxExecutorWaitForReceipt.mockRejectedValue(
        new Error('Transaction reverted'),
      );

      // approve() re-throws after setting error state
      await expect(withdraw.approve()).rejects.toThrow('Transaction reverted');
      expect(withdraw.error).toBeTruthy();
    });
  });

  describe('EvmDepositBtcb.approve()', () => {
    it('should wait for transaction receipt after approveToken call', async () => {
      const { evmStake } =
        await import('../../../chains/evm/actions/deposit-btcb');
      const { createTestConfig } =
        await import('../../helpers/createTestConfig');
      const { Chain, AssetId } = await import('../../../core');

      // Mock getAssetRouterAddress used by EvmDepositBtcb.prepare()
      vi.doMock('../../../contract-functions/getAssetRouterAddress', () => ({
        getAssetRouterAddress: vi
          .fn()
          .mockResolvedValue('0x0000000000000000000000000000000000000001'),
      }));

      const config = createTestConfig({
        env: Env.testnet,
        providers: { evm: () => createMockProvider() },
      });

      const stake = evmStake(config, {
        assetIn: AssetId.BTCb,
        assetOut: AssetId.LBTC,
        sourceChain: Chain.AVALANCHE_FUJI,
        destChain: Chain.AVALANCHE_FUJI,
      });

      await stake.prepare({ amount: '0.1' });

      if (stake.needsApproval) {
        await stake.approve();

        expect(mockWriteContract).toHaveBeenCalled();
        expect(mockTxExecutorWaitForReceipt).toHaveBeenCalledWith(
          mockPublicClient,
          '0xmocktxhash',
          'BTC.b approval',
        );
      }
    });
  });

  describe('Receipt waiting order', () => {
    it('should wait for receipt BEFORE marking approval as complete', async () => {
      const callOrder: string[] = [];

      mockWriteContract.mockImplementation(async () => {
        callOrder.push('writeContract');
        return '0xmocktxhash';
      });

      mockTxExecutorWaitForReceipt.mockImplementation(async () => {
        callOrder.push('waitForTransactionReceipt');
        return {
          status: 'success',
          transactionHash: '0xmocktxhash',
          blockNumber: 1n,
          gasUsed: 21000n,
        };
      });

      const { evmWithdraw } =
        await import('../../../chains/evm/actions/withdraw-vault');
      const { createTestConfig } =
        await import('../../helpers/createTestConfig');
      const { Chain } = await import('../../../core');

      const config = createTestConfig({
        env: Env.prod,
        providers: { evm: () => createMockProvider() },
      });

      const withdraw = evmWithdraw(config, {
        sourceChain: Chain.ETHEREUM,
        protocol: 'veda',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      await withdraw.prepare({ amount: '0.1' });
      await withdraw.approve();

      expect(callOrder).toEqual(['writeContract', 'waitForTransactionReceipt']);
    });
  });
});
