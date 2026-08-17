import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getBasculeDepositStatus,
  SuiBasculeDepositStatus,
} from '../../getBasculeDepositStatus';
import { claimLBTC } from '../claimLBTC';

vi.mock('../../getBasculeDepositStatus', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../getBasculeDepositStatus')>();

  return { ...actual, getBasculeDepositStatus: vi.fn() };
});

// The same synthetic payload the deposit-id derivation is pinned against.
const PAYLOAD =
  'ce25e7c2' +
  '0000000000000000000000000000000000000000000000000000000000000001' +
  'a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1' +
  '00000000000000000000000000000000000000000000000000000000000186a0' +
  'b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2' +
  '0000000000000000000000000000000000000000000000000000000000000003';

const signTransaction = vi
  .fn()
  .mockResolvedValue({ bytes: 'dHg=', signature: 'c2ln' });

const executeTransaction = vi.fn().mockResolvedValue({
  $kind: 'Transaction',
  Transaction: { digest: '0xdigest' },
});

const claim = () =>
  claimLBTC({
    chainId: 'sui:mainnet',
    wallet: {
      features: { 'sui:signTransaction': { signTransaction } },
    } as unknown as Parameters<typeof claimLBTC>[0]['wallet'],
    payload: PAYLOAD,
    proof: 'aabb',
    walletAccount: { address: '0xaccount' } as unknown as Parameters<
      typeof claimLBTC
    >[0]['walletAccount'],
    client: { core: { executeTransaction } } as unknown as SuiGrpcClient,
  });

describe('claimLBTC', () => {
  beforeEach(() => {
    vi.mocked(getBasculeDepositStatus).mockReset();
    signTransaction.mockClear();
  });

  it.each([
    SuiBasculeDepositStatus.REPORTED,
    SuiBasculeDepositStatus.NOT_ENFORCED,
  ])('submits the mint when the status is %s', async (status) => {
    vi.mocked(getBasculeDepositStatus).mockResolvedValue(status);

    await expect(claim()).resolves.toEqual({ digest: '0xdigest' });
    // 'dHg=' is base64 for the bytes of "tx"; pinning them catches a broken
    // base64 conversion, which expect.any(Uint8Array) would let through.
    expect(executeTransaction).toHaveBeenCalledWith({
      transaction: new Uint8Array([0x74, 0x78]),
      signatures: ['c2ln'],
      include: { effects: true },
    });

    expect(signTransaction).toHaveBeenCalledTimes(1);
  });

  it.each([
    [SuiBasculeDepositStatus.UNREPORTED, /unreported/],
    [SuiBasculeDepositStatus.WITHDRAWN, /withdrawn already/],
    [SuiBasculeDepositStatus.PAUSED, /paused/],
  ])('refuses to submit when the status is %s', async (status, message) => {
    vi.mocked(getBasculeDepositStatus).mockResolvedValue(status);

    await expect(claim()).rejects.toThrow(message);

    expect(signTransaction).not.toHaveBeenCalled();
  });

  it('reports an unreadable status as a refusal, keeping the cause', async () => {
    // A node that is down, or a treasury with no bascule_check flag, used to
    // reach the caller as a raw error among plainly worded refusals.
    const cause = new Error('Treasury 0xabc has no bascule_check flag');
    vi.mocked(getBasculeDepositStatus).mockRejectedValue(cause);

    await expect(claim()).rejects.toThrow(/could not be read/);
    await expect(claim()).rejects.toHaveProperty('cause', cause);

    expect(signTransaction).not.toHaveBeenCalled();
  });

  it('rejects a malformed payload as itself', async () => {
    vi.mocked(getBasculeDepositStatus).mockResolvedValue(
      SuiBasculeDepositStatus.REPORTED,
    );

    await expect(
      claimLBTC({
        chainId: 'sui:mainnet',
        wallet: { features: {} } as unknown as Parameters<
          typeof claimLBTC
        >[0]['wallet'],
        payload: 'ce25e7c2',
        proof: 'aabb',
        walletAccount: { address: '0xaccount' } as unknown as Parameters<
          typeof claimLBTC
        >[0]['walletAccount'],
        client: { core: { executeTransaction } } as unknown as SuiGrpcClient,
      }),
    ).rejects.toThrow(/Invalid mint payload length/);
  });
});
