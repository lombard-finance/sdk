/**
 * The one-call sign-in ceremony
 *
 * `signIn` exists because consumers were building it themselves on top of
 * challenge/verify/poll, and the sync-versus-async branch is the part that is
 * easy to get wrong and expensive to get wrong. It is not a choice: an EOA on
 * EVM, Solana or Sui is verified off-chain and the token arrives in the verify
 * response, while a Safe or a Starknet account is verified by a contract call
 * and only yields a token once polled. A consumer that handles the first case
 * only looks correct until the first contract wallet signs in — and then that
 * user has produced a signature and holds no token.
 *
 * So the branch is what these pin, along with the two orderings that matter:
 * the payload that gets signed is the one the challenge returned, and the
 * signature is submitted with that same payload.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestChallenge = vi.hoisted(() => vi.fn());
const verifySignature = vi.hoisted(() => vi.fn());
const pollVerification = vi.hoisted(() => vi.fn());
const revokeToken = vi.hoisted(() => vi.fn());

vi.mock('../../../api-functions/walletAuth/requestWalletChallenge', () => ({
  requestWalletChallenge: requestChallenge,
}));
vi.mock('../../../api-functions/walletAuth/verifyWalletSignature', () => ({
  verifyWalletSignature: verifySignature,
}));
vi.mock('../../../api-functions/walletAuth/pollWalletVerification', () => ({
  pollWalletVerification: pollVerification,
}));
vi.mock('../../../api-functions/walletAuth/revokeWalletToken', () => ({
  revokeWalletToken: revokeToken,
}));

const { WalletAuthService } = await import('../../../services/WalletAuthService');

const ADDRESS = '0x1111111111111111111111111111111111111111';
const CHAIN = 'ethereum';
const PAYLOAD = 'I have read and accept the Terms of Service. Nonce: abc';

function service() {
  return new WalletAuthService(Env.prod);
}

beforeEach(() => {
  vi.clearAllMocks();
  requestChallenge.mockResolvedValue({
    nonce: 'abc',
    payload: PAYLOAD,
    expiresAt: '2026-01-01T00:00:00Z',
  });
});

describe('the synchronous path', () => {
  beforeEach(() => {
    verifySignature.mockResolvedValue({
      kind: 'complete',
      jwt: 'sync-token',
      expiresAt: '2026-01-08T00:00:00Z',
    });
  });

  it('returns the token from the verify response', async () => {
    const result = await service().signIn({
      address: ADDRESS,
      chain: CHAIN,
      sign: async () => ({ signature: '0xsig' }),
    });

    expect(result).toEqual({
      jwt: 'sync-token',
      expiresAt: '2026-01-08T00:00:00Z',
      address: ADDRESS,
    });
  });

  it('does not poll', async () => {
    await service().signIn({
      address: ADDRESS,
      chain: CHAIN,
      sign: async () => ({ signature: '0xsig' }),
    });

    // A poll here would be a wasted round trip against an id that was never
    // issued.
    expect(pollVerification).not.toHaveBeenCalled();
  });
});

describe('the asynchronous path', () => {
  beforeEach(() => {
    verifySignature.mockResolvedValue({
      kind: 'pending',
      verificationId: 'verification-1',
    });
    pollVerification.mockResolvedValue({
      jwt: 'polled-token',
      expiresAt: '2026-01-08T00:00:00Z',
    });
  });

  it('polls the returned id and returns the token from the poll', async () => {
    const result = await service().signIn({
      address: ADDRESS,
      chain: CHAIN,
      sign: async () => ({ signature: '0xsig' }),
    });

    expect(pollVerification).toHaveBeenCalledWith({
      verificationId: 'verification-1',
      env: Env.prod,
    });
    expect(result.jwt).toBe('polled-token');
  });

  // This is the case a hand-rolled flow drops: the verify call resolved
  // successfully, so a caller reading `jwt` off it gets undefined and no error.
  it('never resolves without a token', async () => {
    const result = await service().signIn({
      address: ADDRESS,
      chain: CHAIN,
      sign: async () => ({ signature: '0xsig' }),
    });

    expect(result.jwt).toBeTruthy();
  });

  /**
   * `pollWalletVerification` polls to completion on its own budget and throws
   * only on a terminal failure or its own timeout. Retrying it would turn a
   * definitive rejection into a long hang, so the error is surfaced as-is.
   */
  it('surfaces a terminal verification failure rather than retrying', async () => {
    pollVerification.mockRejectedValue(
      new Error('Wallet verification failed: SIGNATURE_INVALID'),
    );

    await expect(
      service().signIn({
        address: ADDRESS,
        chain: CHAIN,
        sign: async () => ({ signature: '0xsig' }),
      }),
    ).rejects.toThrow(/SIGNATURE_INVALID/);

    expect(pollVerification).toHaveBeenCalledTimes(1);
  });
});

describe('what gets signed and submitted', () => {
  beforeEach(() => {
    verifySignature.mockResolvedValue({
      kind: 'complete',
      jwt: 'token',
      expiresAt: '2026-01-08T00:00:00Z',
    });
  });

  it('signs the payload the challenge returned', async () => {
    const sign = vi.fn().mockResolvedValue({ signature: '0xsig' });

    await service().signIn({ address: ADDRESS, chain: CHAIN, sign });

    expect(sign).toHaveBeenCalledWith(PAYLOAD);
  });

  // The nonce ties the signature to the challenge, so submitting a different
  // payload than the one signed fails verification for a reason that is
  // invisible from the outside.
  it('submits that same payload alongside the signature', async () => {
    await service().signIn({
      address: ADDRESS,
      chain: CHAIN,
      sign: async () => ({ signature: '0xsig' }),
    });

    expect(verifySignature).toHaveBeenCalledWith({
      address: ADDRESS,
      chain: CHAIN,
      payload: PAYLOAD,
      signature: '0xsig',
      publicKey: undefined,
      env: Env.prod,
    });
  });

  it('forwards a public key when the signer supplies one', async () => {
    await service().signIn({
      address: ADDRESS,
      chain: 'starknet',
      sign: async () => ({ signature: '0xsig', publicKey: '0xpub' }),
    });

    expect(verifySignature).toHaveBeenCalledWith(
      expect.objectContaining({ publicKey: '0xpub' }),
    );
  });

  it('carries the env through to every call', async () => {
    await service().signIn({
      address: ADDRESS,
      chain: CHAIN,
      sign: async () => ({ signature: '0xsig' }),
    });

    expect(requestChallenge).toHaveBeenCalledWith(
      expect.objectContaining({ env: Env.prod }),
    );
  });

  it('propagates a rejected signature without verifying', async () => {
    await expect(
      service().signIn({
        address: ADDRESS,
        chain: CHAIN,
        sign: async () => {
          throw new Error('User rejected the request');
        },
      }),
    ).rejects.toThrow(/User rejected/);

    expect(verifySignature).not.toHaveBeenCalled();
  });
});
