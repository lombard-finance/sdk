import { Address } from 'viem';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../common/chains';
import { withdrawEarn } from '../../../contract-functions/withdrawEarn/withdrawEarn';

const mockReadContract = vi.fn();
const mockSimulateContract = vi.fn();
const mockWriteContract = vi.fn();
const mockWaitForReceipt = vi.fn();

vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn(() => ({
    readContract: (...args: unknown[]) => mockReadContract(...args),
    simulateContract: (...args: unknown[]) => mockSimulateContract(...args),
    waitForTransactionReceipt: (...args: unknown[]) =>
      mockWaitForReceipt(...args),
  })),
}));

vi.mock('../../../clients/wallet-client', () => ({
  makeWalletClient: vi.fn(() => ({
    writeContract: (...args: unknown[]) => mockWriteContract(...args),
  })),
}));

// Every Earn chain currently has a BTCe deployment, so the "no BTCe" branch is
// unreachable through the public API. Force it here so the branch keeps its
// coverage for any future Earn chain that ships without the wrapper.
const btceGate = vi.hoisted(() => ({ forceUnsupported: false }));

vi.mock('../../../vaults/lib/config', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  const realIsBtceVaultChain = actual.isBtceVaultChain as (
    chainId: number,
  ) => boolean;
  return {
    ...actual,
    isBtceVaultChain: (chainId: number) =>
      !btceGate.forceUnsupported && realIsBtceVaultChain(chainId),
  };
});

vi.mock('../../../tokens/tokens', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getTokenInfo: vi.fn().mockResolvedValue({
      address: '0x8236a87084f8B84306f72007F36F2618A5634494',
      abi: [],
      symbol: 'LBTC',
      decimals: 8,
    }),
  };
});

const ACCOUNT = '0x000000000000000000000000000000000000dEaD';
const LENS = '0x5232bc0F5999f8dA604c42E1748A13a170F94A1B';
const VAULT = '0x5401b8620E5FB570064CA9114fd1e135fd77D57c';
const BTCE = '0x3a4baaBf4DC9910596821615e848f0e6545762F3';
const QUEUE = '0x3b4aCd8879fb60586cCd74bC2F831A4C5E7DbBf8';
const PROVIDER = {
  request: vi.fn(),
} as unknown as Parameters<typeof withdrawEarn>[0]['provider'];

interface ReadCall {
  functionName: string;
  address: Address;
  args?: readonly unknown[];
}

interface State {
  underlyingBalance?: bigint;
  btceBalance?: bigint;
  allowance?: bigint;
  maxWithdraw?: bigint;
}

function setupReads(state: State) {
  mockReadContract.mockImplementation((call: ReadCall) => {
    const addr = call.address.toLowerCase();
    if (call.functionName === 'balanceOf' && addr === LENS.toLowerCase()) {
      return Promise.resolve(state.underlyingBalance ?? 0n);
    }
    if (call.functionName === 'balanceOf' && addr === BTCE.toLowerCase()) {
      return Promise.resolve(state.btceBalance ?? 0n);
    }
    if (call.functionName === 'allowance') {
      return Promise.resolve(state.allowance ?? 0n);
    }
    if (call.functionName === 'maxWithdraw' && addr === BTCE.toLowerCase()) {
      return Promise.resolve(state.maxWithdraw ?? state.btceBalance ?? 0n);
    }
    return Promise.reject(
      new Error(`Unexpected read: ${call.functionName} @ ${call.address}`),
    );
  });
}

describe('withdrawEarn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let counter = 0;
    mockSimulateContract.mockImplementation(({ functionName }) => {
      counter++;
      return Promise.resolve({
        request: { functionName, marker: counter },
      });
    });
    mockWriteContract.mockImplementation(({ functionName, marker }) =>
      Promise.resolve(`0x${functionName}_${marker}` as `0x${string}`),
    );
    mockWaitForReceipt.mockResolvedValue({
      status: 'success',
      transactionHash: '0xreceipt',
    });
  });

  describe('case: underlying-only holder, has allowance', () => {
    it('skips approve + unwrap, sends just the queue tx (1 sig)', async () => {
      setupReads({
        underlyingBalance: 100_000_000n, // 1 LBTCv
        btceBalance: 0n,
        allowance: 200_000_000n, // > amount
      });

      const result = await withdrawEarn({
        amount: '0.5',
        account: ACCOUNT,
        chainId: ChainId.ethereum,
        provider: PROVIDER,
      });

      expect(result.approveTxHash).toBeUndefined();
      expect(result.unwrapTxHash).toBeUndefined();
      expect(result.queueTxHash).toMatch(/safeUpdateAtomicRequest/);
      expect(mockSimulateContract).toHaveBeenCalledTimes(1);
      expect(mockWriteContract).toHaveBeenCalledTimes(1);
    });
  });

  describe('case: underlying-only holder, no allowance', () => {
    it('approves then queues (2 sigs)', async () => {
      setupReads({
        underlyingBalance: 100_000_000n,
        btceBalance: 0n,
        allowance: 0n,
      });

      const result = await withdrawEarn({
        amount: '0.5',
        account: ACCOUNT,
        chainId: ChainId.ethereum,
        provider: PROVIDER,
      });

      expect(result.approveTxHash).toMatch(/approve/);
      expect(result.unwrapTxHash).toBeUndefined();
      expect(result.queueTxHash).toMatch(/safeUpdateAtomicRequest/);

      const fnNames = mockSimulateContract.mock.calls.map(
        (c) => c[0].functionName,
      );
      expect(fnNames).toEqual(['approve', 'safeUpdateAtomicRequest']);
      expect(mockWaitForReceipt).toHaveBeenCalledTimes(1); // approval receipt
    });
  });

  describe('case: pure BTCe holder, no allowance, fresh', () => {
    it('unwraps, approves, queues (3 sigs)', async () => {
      setupReads({
        underlyingBalance: 0n,
        btceBalance: 100_000_000n,
        allowance: 0n,
        maxWithdraw: 100_000_000n,
      });

      const result = await withdrawEarn({
        amount: '0.5',
        account: ACCOUNT,
        chainId: ChainId.ethereum,
        provider: PROVIDER,
      });

      expect(result.approveTxHash).toMatch(/approve/);
      expect(result.unwrapTxHash).toMatch(/withdraw_/);
      expect(result.queueTxHash).toMatch(/safeUpdateAtomicRequest/);

      // Unwrap MUST happen before approve so wallets that cap approve at
      // current balance see the post-unwrap LBTCv balance.
      const fnNames = mockSimulateContract.mock.calls.map(
        (c) => c[0].functionName,
      );
      expect(fnNames).toEqual([
        'withdraw',
        'approve',
        'safeUpdateAtomicRequest',
      ]);
      // 2 receipts: unwrap + approval
      expect(mockWaitForReceipt).toHaveBeenCalledTimes(2);
    });
  });

  describe('case: mixed holder, underlying covers amount', () => {
    it('skips unwrap when underlying balance is enough', async () => {
      setupReads({
        underlyingBalance: 100_000_000n,
        btceBalance: 50_000_000n,
        allowance: 200_000_000n,
        maxWithdraw: 50_000_000n,
      });

      const result = await withdrawEarn({
        amount: '0.5',
        account: ACCOUNT,
        chainId: ChainId.ethereum,
        provider: PROVIDER,
      });

      expect(result.unwrapTxHash).toBeUndefined();
      expect(result.queueTxHash).toMatch(/safeUpdateAtomicRequest/);
    });
  });

  describe('case: mixed holder, underlying does not cover', () => {
    it('unwraps just the gap, then queues', async () => {
      setupReads({
        underlyingBalance: 30_000_000n, // 0.3
        btceBalance: 50_000_000n, // 0.5
        allowance: 200_000_000n,
        maxWithdraw: 50_000_000n,
      });

      const result = await withdrawEarn({
        amount: '0.5', // need 0.5 - 0.3 = 0.2 LBTCv from unwrap
        account: ACCOUNT,
        chainId: ChainId.ethereum,
        provider: PROVIDER,
      });

      expect(result.unwrapTxHash).toMatch(/withdraw_/);

      const unwrapCall = mockSimulateContract.mock.calls.find(
        (c) => c[0].functionName === 'withdraw',
      )?.[0];
      // assets arg: 0.2 LBTCv = 20_000_000 base units
      expect(unwrapCall.args[0]).toBe(20_000_000n);
    });
  });

  // Regression: when a wallet caps approve at current LBTCv balance (e.g. OKX),
  // approving before unwrap leaves allowance < amount and the queue tx fails.
  // Doing unwrap first ensures the post-unwrap balance is visible to the
  // wallet at approve time.
  describe('case: mixed holder, no allowance — unwrap before approve', () => {
    it('orders unwrap, approve, queue (3 sigs)', async () => {
      setupReads({
        underlyingBalance: 13_000n, // 0.00013 LBTCv
        btceBalance: 19_762n, // ~0.000198 BTCe
        allowance: 0n,
        maxWithdraw: 19_762n,
      });

      const result = await withdrawEarn({
        amount: '0.00015', // > current LBTCv balance, requires unwrap
        account: ACCOUNT,
        chainId: ChainId.ethereum,
        provider: PROVIDER,
      });

      expect(result.unwrapTxHash).toMatch(/withdraw_/);
      expect(result.approveTxHash).toMatch(/approve/);
      expect(result.queueTxHash).toMatch(/safeUpdateAtomicRequest/);

      const fnNames = mockSimulateContract.mock.calls.map(
        (c) => c[0].functionName,
      );
      expect(fnNames).toEqual([
        'withdraw',
        'approve',
        'safeUpdateAtomicRequest',
      ]);
    });
  });

  describe('error: amount exceeds total position', () => {
    it('throws InsufficientPositionError before any tx', async () => {
      setupReads({
        underlyingBalance: 30_000_000n,
        btceBalance: 20_000_000n,
        allowance: 0n,
      });

      await expect(
        withdrawEarn({
          amount: '1', // > 0.3 + 0.2
          account: ACCOUNT,
          chainId: ChainId.ethereum,
          provider: PROVIDER,
        }),
      ).rejects.toThrow(/InsufficientPositionError/);

      expect(mockSimulateContract).not.toHaveBeenCalled();
      expect(mockWriteContract).not.toHaveBeenCalled();
    });
  });

  describe('error: maxWithdraw below needed unwrap (race)', () => {
    it('throws InsufficientUnwrappableError before any tx (no approval gas wasted)', async () => {
      setupReads({
        underlyingBalance: 30_000_000n,
        btceBalance: 50_000_000n, // claims 0.5
        allowance: 0n,
        maxWithdraw: 10_000_000n, // but only 0.1 actually withdrawable
      });

      await expect(
        withdrawEarn({
          amount: '0.5', // needs 0.2 from unwrap, only 0.1 available
          account: ACCOUNT,
          chainId: ChainId.ethereum,
          provider: PROVIDER,
        }),
      ).rejects.toThrow(/InsufficientUnwrappableError/);

      // Council B2: NO transactions sent, including the approval
      expect(mockSimulateContract).not.toHaveBeenCalled();
      expect(mockWriteContract).not.toHaveBeenCalled();
    });
  });

  describe('case: Earn chain without a BTCe deployment', () => {
    beforeEach(() => {
      btceGate.forceUnsupported = true;
    });

    afterEach(() => {
      btceGate.forceUnsupported = false;
    });

    it('skips BTCe reads and unwrap entirely', async () => {
      setupReads({
        underlyingBalance: 100_000_000n,
        allowance: 200_000_000n,
      });

      const result = await withdrawEarn({
        amount: '0.5',
        account: ACCOUNT,
        chainId: ChainId.ethereum,
        provider: PROVIDER,
      });

      expect(result.unwrapTxHash).toBeUndefined();

      const reads = mockReadContract.mock.calls.map((c) => c[0]);
      const btceReads = reads.filter(
        (r) => r.address.toLowerCase() === BTCE.toLowerCase(),
      );
      expect(btceReads).toHaveLength(0);
    });
  });

  describe('input validation', () => {
    it('throws for zero amount', async () => {
      await expect(
        withdrawEarn({
          amount: '0',
          account: ACCOUNT,
          chainId: ChainId.ethereum,
          provider: PROVIDER,
        }),
      ).rejects.toThrow(/must be greater than zero/);
    });

    it('throws for unsupported chain', async () => {
      await expect(
        withdrawEarn({
          amount: '0.1',
          account: ACCOUNT,
          chainId: ChainId.sepolia,
          provider: PROVIDER,
        }),
      ).rejects.toThrow(/Unsupported chain/);
    });
  });

  describe('queue request shape', () => {
    it('files atomic request against the LBTCv vault and chosen withdrawal asset', async () => {
      setupReads({
        underlyingBalance: 100_000_000n,
        allowance: 200_000_000n,
      });

      await withdrawEarn({
        amount: '0.5',
        account: ACCOUNT,
        chainId: ChainId.ethereum,
        provider: PROVIDER,
      });

      const queueCall = mockSimulateContract.mock.calls.find(
        (c) => c[0].functionName === 'safeUpdateAtomicRequest',
      )?.[0];

      expect(queueCall.address).toBe(QUEUE);
      // [vault, withdrawToken, request, accountant, discount]
      expect(queueCall.args[0]).toBe(VAULT);
      // request: [deadline, atomicPrice, offerAmount, inSolve]
      const request = queueCall.args[2];
      expect(request[1]).toBe(0n); // atomicPrice
      expect(request[2]).toBe(50_000_000n); // 0.5 LBTCv
      expect(request[3]).toBe(false); // inSolve
    });
  });
});
