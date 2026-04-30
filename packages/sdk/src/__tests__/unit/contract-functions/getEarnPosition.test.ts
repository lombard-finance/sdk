import BigNumber from 'bignumber.js';
import { Address } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../common/chains';
import { getEarnPosition } from '../../../contract-functions/getEarnPosition/getEarnPosition';

const mockReadContract = vi.fn();

vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn().mockReturnValue({
    readContract: (...args: unknown[]) => mockReadContract(...args) }) }));

const TEST_ADDRESS = '0x000000000000000000000000000000000000dEaD';
const LENS_ADDRESS = '0x5232bc0F5999f8dA604c42E1748A13a170F94A1B';
const BTCE_ADDRESS = '0x3a4baaBf4DC9910596821615e848f0e6545762F3';
const ACCOUNTANT_ADDRESS = '0x28634D0c5edC67CF2450E74deA49B90a4FF93dCE';

interface ReadCall {
  abi: unknown;
  address: Address;
  functionName: string;
  args?: readonly unknown[];
}

interface MockState {
  lbtcvBalance?: bigint;
  btceBalance?: bigint;
  rate?: bigint;
  /** ratio numerator: lbtcvEquivalent = btceShares * convertRatioNum / convertRatioDen */
  convertRatioNum?: bigint;
  convertRatioDen?: bigint;
  failOn?: { functionName: string; address?: Address };
}

function setupContract(state: MockState) {
  mockReadContract.mockImplementation((call: ReadCall) => {
    if (
      state.failOn &&
      call.functionName === state.failOn.functionName &&
      (state.failOn.address === undefined ||
        call.address.toLowerCase() === state.failOn.address.toLowerCase())
    ) {
      return Promise.reject(new Error('execution reverted'));
    }
    if (
      call.functionName === 'balanceOf' &&
      call.address.toLowerCase() === LENS_ADDRESS.toLowerCase()
    ) {
      return Promise.resolve(state.lbtcvBalance ?? 0n);
    }
    if (
      call.functionName === 'balanceOf' &&
      call.address.toLowerCase() === BTCE_ADDRESS.toLowerCase()
    ) {
      return Promise.resolve(state.btceBalance ?? 0n);
    }
    if (
      call.functionName === 'getRate' &&
      call.address.toLowerCase() === ACCOUNTANT_ADDRESS.toLowerCase()
    ) {
      return Promise.resolve(state.rate ?? 100_000_000n);
    }
    if (
      call.functionName === 'convertToAssets' &&
      call.address.toLowerCase() === BTCE_ADDRESS.toLowerCase()
    ) {
      const shares = (call.args?.[0] as bigint) ?? 0n;
      const num = state.convertRatioNum ?? 1n;
      const den = state.convertRatioDen ?? 1n;
      return Promise.resolve((shares * num) / den);
    }
    return Promise.reject(
      new Error(`Unexpected mock call: ${call.functionName} @ ${call.address}`),
    );
  });
}

describe('getEarnPosition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1:1 BTCe wrapper (current production state)', () => {
    it('sums LBTCv and BTCe shares and applies the accountant rate', async () => {
      setupContract({
        lbtcvBalance: 30_000_000n, // 0.3 LBTCv
        btceBalance: 70_000_000n, // 0.7 BTCe
        rate: 105_000_000n, // 1.05 LBTC per LBTCv
        convertRatioNum: 1n,
        convertRatioDen: 1n, // 1:1 wrapper
      });

      const result = await getEarnPosition({
        address: TEST_ADDRESS,
        chainId: ChainId.ethereum });

      expect(result.underlyingShares).toEqual(BigNumber('0.3'));
      expect(result.btceShares).toEqual(BigNumber('0.7'));
      expect(result.btceSharesInUnderlying).toEqual(BigNumber('0.7'));
      expect(result.totalShares).toEqual(BigNumber('1'));
      expect(result.exchangeRate).toEqual(BigNumber('1.05'));
      expect(result.position).toEqual(BigNumber('1.05'));
    });
  });

  describe('non-1:1 BTCe wrapper (future-safe path)', () => {
    it('uses convertToAssets to value BTCe shares in LBTCv terms', async () => {
      // Wrapper has accrued internal yield: 1 BTCe = 1.07142857... LBTCv
      // 70_000_000 BTCe shares -> 75_000_000 LBTCv via convertToAssets
      setupContract({
        lbtcvBalance: 30_000_000n, // 0.3 LBTCv
        btceBalance: 70_000_000n, // 0.7 BTCe
        rate: 100_000_000n, // 1.0 (peg)
        convertRatioNum: 75n,
        convertRatioDen: 70n });

      const result = await getEarnPosition({
        address: TEST_ADDRESS,
        chainId: ChainId.ethereum });

      expect(result.btceShares).toEqual(BigNumber('0.7'));
      expect(result.btceSharesInUnderlying).toEqual(BigNumber('0.75'));
      expect(result.totalShares).toEqual(BigNumber('1.05'));
      expect(result.position).toEqual(BigNumber('1.05'));
    });
  });

  describe('zero balances', () => {
    it('skips convertToAssets when BTCe balance is zero', async () => {
      setupContract({
        lbtcvBalance: 25_000_000n,
        btceBalance: 0n,
        rate: 100_000_000n });

      const result = await getEarnPosition({
        address: TEST_ADDRESS,
        chainId: ChainId.ethereum });

      expect(result.btceShares).toEqual(BigNumber(0));
      expect(result.btceSharesInUnderlying).toEqual(BigNumber(0));
      expect(result.position).toEqual(BigNumber('0.25'));

      const convertCalls = mockReadContract.mock.calls.filter(
        ([call]) => (call as ReadCall).functionName === 'convertToAssets',
      );
      expect(convertCalls).toHaveLength(0);
    });

    it('returns all zeros for an address with no holdings', async () => {
      setupContract({
        lbtcvBalance: 0n,
        btceBalance: 0n,
        rate: 100_000_000n });

      const result = await getEarnPosition({
        address: TEST_ADDRESS,
        chainId: ChainId.ethereum });

      expect(result.underlyingShares).toEqual(BigNumber(0));
      expect(result.btceShares).toEqual(BigNumber(0));
      expect(result.position).toEqual(BigNumber(0));
    });
  });

  describe('chains without BTCe support', () => {
    it('returns zero BTCe and only the LBTCv leg on Corn', async () => {
      setupContract({
        lbtcvBalance: 40_000_000n,
        rate: 100_000_000n });

      const result = await getEarnPosition({
        address: TEST_ADDRESS,
        chainId: ChainId.corn });

      expect(result.btceShares).toEqual(BigNumber(0));
      expect(result.btceSharesInUnderlying).toEqual(BigNumber(0));
      expect(result.position).toEqual(BigNumber('0.4'));

      const btceCalls = mockReadContract.mock.calls.filter(
        ([call]) =>
          (call as ReadCall).address.toLowerCase() ===
          BTCE_ADDRESS.toLowerCase(),
      );
      expect(btceCalls).toHaveLength(0);
    });
  });

  describe('error surfacing', () => {
    it('surfaces BTCe.balanceOf failures (does not silently zero)', async () => {
      setupContract({
        lbtcvBalance: 10_000_000n,
        rate: 100_000_000n,
        failOn: { functionName: 'balanceOf', address: BTCE_ADDRESS } });

      await expect(
        getEarnPosition({
          address: TEST_ADDRESS,
          chainId: ChainId.ethereum }),
      ).rejects.toThrow();
    });

    it('surfaces BTCe.convertToAssets failures', async () => {
      setupContract({
        lbtcvBalance: 10_000_000n,
        btceBalance: 50_000_000n,
        rate: 100_000_000n,
        failOn: { functionName: 'convertToAssets' } });

      await expect(
        getEarnPosition({
          address: TEST_ADDRESS,
          chainId: ChainId.ethereum }),
      ).rejects.toThrow();
    });

    it('surfaces LBTCv read failures', async () => {
      setupContract({
        rate: 100_000_000n,
        failOn: { functionName: 'balanceOf', address: LENS_ADDRESS } });

      await expect(
        getEarnPosition({
          address: TEST_ADDRESS,
          chainId: ChainId.ethereum }),
      ).rejects.toThrow();
    });
  });

  describe('input validation', () => {
    it('throws for an invalid address', async () => {
      await expect(
        getEarnPosition({
          address: '0xnotanaddress',
          chainId: ChainId.ethereum }),
      ).rejects.toThrow(/Invalid address/);
    });
  });

  describe('chain support', () => {
    it.each([
      ['Ethereum', ChainId.ethereum],
      ['Base', ChainId.base],
      ['BSC', ChainId.binanceSmartChain],
    ] as const)('supports BTCe on %s', async (_label, chainId) => {
      setupContract({
        lbtcvBalance: 0n,
        btceBalance: 100_000_000n,
        rate: 100_000_000n,
        convertRatioNum: 1n,
        convertRatioDen: 1n });

      const result = await getEarnPosition({
        address: TEST_ADDRESS,
        chainId });

      expect(result.btceShares).toEqual(BigNumber('1'));
      expect(result.btceSharesInUnderlying).toEqual(BigNumber('1'));
    });

    it('supports Corn (LBTCv only, no BTCe)', async () => {
      setupContract({
        lbtcvBalance: 100_000_000n,
        rate: 100_000_000n });

      const result = await getEarnPosition({
        address: TEST_ADDRESS,
        chainId: ChainId.corn });

      expect(result.underlyingShares).toEqual(BigNumber('1'));
      expect(result.position).toEqual(BigNumber('1'));
    });
  });
});
