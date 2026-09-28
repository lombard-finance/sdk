import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../common/chains';
import { cancelEarnWithdrawal } from '../../../contract-functions/cancelEarnWithdrawal/cancelEarnWithdrawal';

const mockSimulateContract = vi.fn();
const mockWriteContract = vi.fn();

vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn(() => ({
    simulateContract: (...args: unknown[]) => mockSimulateContract(...args),
  })),
}));

vi.mock('../../../clients/wallet-client', () => ({
  makeWalletClient: vi.fn(() => ({
    writeContract: (...args: unknown[]) => mockWriteContract(...args),
  })),
}));

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
const ATOMIC_QUEUE = '0x3b4aCd8879fb60586cCd74bC2F831A4C5E7DbBf8';
const BORING_QUEUE = '0x4a20F4948c435fDA923399F89800CdC373de88cB';
const PROVIDER = {
  request: vi.fn(),
} as unknown as Parameters<typeof cancelEarnWithdrawal>[0]['provider'];

const BORING_REQUEST = {
  nonce: 242,
  user: ACCOUNT,
  assetOut: '0x8236a87084f8B84306f72007F36F2618A5634494',
  amountOfShares: 100103648,
  amountOfAssets: 100033195,
  creationTime: 1782483635,
  secondsToMaturity: 86400,
  secondsToDeadline: 1209600,
};

describe('cancelEarnWithdrawal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSimulateContract.mockImplementation(({ functionName }) =>
      Promise.resolve({ request: { functionName } }),
    );
    mockWriteContract.mockImplementation(({ functionName }) =>
      Promise.resolve(`0x${functionName}` as `0x${string}`),
    );
  });

  it('defaults to AtomicQueue (updateAtomicRequest)', async () => {
    await cancelEarnWithdrawal({
      account: ACCOUNT,
      chainId: ChainId.ethereum,
      provider: PROVIDER,
    });

    const call = mockSimulateContract.mock.calls[0][0];
    expect(call.functionName).toBe('updateAtomicRequest');
    expect(call.address).toBe(ATOMIC_QUEUE);
  });

  it('cancels on the BoringQueue with the request struct as bigints', async () => {
    await cancelEarnWithdrawal({
      queue: 'boring',
      request: BORING_REQUEST,
      account: ACCOUNT,
      chainId: ChainId.ethereum,
      provider: PROVIDER,
    });

    const call = mockSimulateContract.mock.calls[0][0];
    expect(call.functionName).toBe('cancelOnChainWithdraw');
    expect(call.address).toBe(BORING_QUEUE);

    const struct = call.args[0];
    expect(struct.nonce).toBe(242n);
    expect(struct.amountOfShares).toBe(100103648n);
    expect(struct.amountOfAssets).toBe(100033195n);
    expect(struct.creationTime).toBe(1782483635n);
    expect(struct.secondsToMaturity).toBe(86400n);
    expect(struct.secondsToDeadline).toBe(1209600n);
    expect(struct.user).toBe(ACCOUNT);
    expect(struct.assetOut).toBe(BORING_REQUEST.assetOut);
  });

  it('throws when queue is boring but no request struct is provided', async () => {
    await expect(
      cancelEarnWithdrawal({
        queue: 'boring',
        account: ACCOUNT,
        chainId: ChainId.ethereum,
        provider: PROVIDER,
      }),
    ).rejects.toThrow(/requires the original request struct/);

    expect(mockSimulateContract).not.toHaveBeenCalled();
  });
});
