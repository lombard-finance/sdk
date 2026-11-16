import { Address, maxUint256 } from 'viem';
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
const BTCE = '0x3a4baaBf4DC9910596821615e848f0e6545762F3';
/** The older AtomicQueue, which nothing may file against any more. */
const ATOMIC_QUEUE = '0x3b4aCd8879fb60586cCd74bC2F831A4C5E7DbBf8';
const BORING_QUEUE = '0x4a20F4948c435fDA923399F89800CdC373de88cB';
const LBTC = '0x8236a87084f8B84306f72007F36F2618A5634494';
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
  /** BoringQueue `withdrawAssets(asset).allowWithdraws`; defaults to enabled. */
  allowWithdrawsInAsset?: boolean;
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
    if (
      call.functionName === 'withdrawAssets' &&
      addr === BORING_QUEUE.toLowerCase()
    ) {
      // [allowWithdraws, secondsToMaturity, minimumSecondsToDeadline,
      //  minDiscount, maxDiscount, minimumShares, withdrawCapacity]
      return Promise.resolve([
        state.allowWithdrawsInAsset ?? true,
        3600,
        1728000,
        0,
        10,
        0n,
        maxUint256,
      ]);
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
      expect(result.queueTxHash).toMatch(/requestOnChainWithdraw/);
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
      expect(result.queueTxHash).toMatch(/requestOnChainWithdraw/);

      const fnNames = mockSimulateContract.mock.calls.map(
        (c) => c[0].functionName,
      );
      expect(fnNames).toEqual(['approve', 'requestOnChainWithdraw']);
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
      expect(result.queueTxHash).toMatch(/requestOnChainWithdraw/);

      // Unwrap MUST happen before approve so wallets that cap approve at
      // current balance see the post-unwrap LBTCv balance.
      const fnNames = mockSimulateContract.mock.calls.map(
        (c) => c[0].functionName,
      );
      expect(fnNames).toEqual([
        'withdraw',
        'approve',
        'requestOnChainWithdraw',
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
      expect(result.queueTxHash).toMatch(/requestOnChainWithdraw/);
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
      expect(result.queueTxHash).toMatch(/requestOnChainWithdraw/);

      const fnNames = mockSimulateContract.mock.calls.map(
        (c) => c[0].functionName,
      );
      expect(fnNames).toEqual([
        'withdraw',
        'approve',
        'requestOnChainWithdraw',
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

  describe('BoringQueue request', () => {
    it('files requestOnChainWithdraw against the BoringQueue with LBTC/discount/deadline', async () => {
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

      // Only one tx: the BoringQueue request (has allowance, underlying-only).
      expect(result.approveTxHash).toBeUndefined();
      expect(result.unwrapTxHash).toBeUndefined();
      expect(result.queueTxHash).toMatch(/requestOnChainWithdraw/);

      const queueCall = mockSimulateContract.mock.calls.find(
        (c) => c[0].functionName === 'requestOnChainWithdraw',
      )?.[0];

      // Routes to the BoringQueue, NOT the legacy AtomicQueue.
      expect(queueCall.address).toBe(BORING_QUEUE);
      // args: [assetOut, amountOfShares, discount(bps), secondsToDeadline]
      expect(queueCall.args[0]).toBe(LBTC);
      expect(queueCall.args[1]).toBe(50_000_000n); // 0.5 LBTCv shares
      expect(queueCall.args[2]).toBe(1); // discount bps (within LBTC 0-10 bounds)
      expect(queueCall.args[3]).toBe(21 * 86_400); // 21 days, >= 20-day on-chain min
    });

    it.each([
      ['Base', ChainId.base],
      ['BSC', ChainId.binanceSmartChain],
    ])('files against the BoringQueue on %s', async (_, chainId) => {
      setupReads({
        underlyingBalance: 100_000_000n,
        allowance: 0n,
      });

      await withdrawEarn({
        amount: '0.5',
        account: ACCOUNT,
        chainId,
        provider: PROVIDER,
      });

      const calls = mockSimulateContract.mock.calls.map((c) => c[0]);
      expect(calls.map((c) => c.functionName)).toEqual([
        'approve',
        'requestOnChainWithdraw',
      ]);
      expect(calls[0].args[0]).toBe(BORING_QUEUE);
      expect(calls[1].address).toBe(BORING_QUEUE);
    });

    it('refuses an asset the queue has stopped, before sending anything', async () => {
      setupReads({
        underlyingBalance: 100_000_000n,
        allowance: 0n,
        allowWithdrawsInAsset: false,
      });

      await expect(
        withdrawEarn({
          amount: '0.5',
          account: ACCOUNT,
          chainId: ChainId.ethereum,
          provider: PROVIDER,
        }),
      ).rejects.toThrow(/does not accept LBTC/);

      // Notably not even the approval: on-chain this would only surface as
      // BoringOnChainQueue__WithdrawsNotAllowedForAsset after paying for it.
      expect(mockSimulateContract).not.toHaveBeenCalled();
      expect(mockWriteContract).not.toHaveBeenCalled();
    });

    it('approves the BoringQueue address (not AtomicQueue) when allowance is short', async () => {
      setupReads({
        underlyingBalance: 100_000_000n,
        allowance: 0n,
      });

      await withdrawEarn({
        amount: '0.5',
        account: ACCOUNT,
        chainId: ChainId.ethereum,
        provider: PROVIDER,
      });

      const fnNames = mockSimulateContract.mock.calls.map(
        (c) => c[0].functionName,
      );
      expect(fnNames).toEqual(['approve', 'requestOnChainWithdraw']);

      const approveCall = mockSimulateContract.mock.calls.find(
        (c) => c[0].functionName === 'approve',
      )?.[0];
      expect(approveCall.args[0]).toBe(BORING_QUEUE); // spender = BoringQueue
    });

    it('files on the BoringQueue without being asked, and never touches the AtomicQueue', async () => {
      setupReads({
        underlyingBalance: 100_000_000n,
        allowance: 0n,
      });

      const result = await withdrawEarn({
        amount: '0.5',
        account: ACCOUNT,
        chainId: ChainId.ethereum,
        provider: PROVIDER,
      });

      expect(result.queueTxHash).toMatch(/requestOnChainWithdraw/);
      const touched = [
        ...mockReadContract.mock.calls.map((c) => c[0].address),
        ...mockSimulateContract.mock.calls.map((c) => c[0].address),
        ...mockSimulateContract.mock.calls.flatMap((c) => c[0].args ?? []),
      ].map((value) => String(value).toLowerCase());
      expect(touched).not.toContain(ATOMIC_QUEUE.toLowerCase());
      expect(
        mockSimulateContract.mock.calls.map((c) => c[0].functionName),
      ).not.toContain('safeUpdateAtomicRequest');
    });

    it("accepts the deprecated queue: 'boring' and files on the BoringQueue", async () => {
      setupReads({
        underlyingBalance: 100_000_000n,
        allowance: 200_000_000n,
      });

      const result = await withdrawEarn({
        amount: '0.5',
        queue: 'boring',
        account: ACCOUNT,
        chainId: ChainId.ethereum,
        provider: PROVIDER,
      });

      expect(result.queueTxHash).toMatch(/requestOnChainWithdraw/);
      const [queueCall] = mockSimulateContract.mock.calls.map((c) => c[0]);
      expect(queueCall.address).toBe(BORING_QUEUE);
    });

    it("refuses queue: 'atomic' from an untyped caller before reading or sending anything", async () => {
      setupReads({
        underlyingBalance: 100_000_000n,
        allowance: 200_000_000n,
      });

      await expect(
        withdrawEarn({
          amount: '0.5',
          account: ACCOUNT,
          chainId: ChainId.ethereum,
          provider: PROVIDER,
          // Untyped JavaScript, or a cast, can still send it.
          ...({ queue: 'atomic' } as object),
        }),
      ).rejects.toThrow(/Unsupported withdrawal queue: atomic/);

      expect(mockReadContract).not.toHaveBeenCalled();
      expect(mockSimulateContract).not.toHaveBeenCalled();
      expect(mockWriteContract).not.toHaveBeenCalled();
    });

    it("keeps queue: 'atomic' a type error", () => {
      const params: Parameters<typeof withdrawEarn>[0] = {
        amount: '0.5',
        account: ACCOUNT,
        chainId: ChainId.ethereum,
        provider: PROVIDER,
        // @ts-expect-error only 'boring' is accepted
        queue: 'atomic',
      };
      expect(params.queue).toBe('atomic');
    });
  });
});
