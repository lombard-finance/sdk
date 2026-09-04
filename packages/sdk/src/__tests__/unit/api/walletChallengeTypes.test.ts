import { Env, WALLET_CHALLENGE_TYPE } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Mocked at the `utils/http` boundary, not at axios.
 *
 * These api-functions post through the wrapper on this branch — the auth-token
 * boundary test requires it of anything resolving a Lombard host — so mocking
 * `axios.post` would leave the wrapper calling a mock that was never set up and
 * assert nothing about the request. The argument positions are the same,
 * `httpPost(url, body, config)`, so the assertions below are unchanged.
 */
const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('../../../utils/http', () => ({ httpPost: post }));
vi.mock('axios', () => ({
  default: vi.fn(),
  isAxiosError: (e: unknown) =>
    Boolean((e as { isAxiosError?: boolean } | null)?.isAxiosError),
}));

const { requestWalletChallenge } =
  await import('../../../api-functions/walletAuth/requestWalletChallenge');
const { verifyWalletSignature } =
  await import('../../../api-functions/walletAuth/verifyWalletSignature');
const { ActivePermitExistsError } = await import('../../../utils/err');

const address = '0xC1A0000000000000000000000000000000000000';
const base = { address, chain: 'BLOCKCHAIN_ETHEREUM', env: Env.stage };

/** A permit challenge as the gateway returns it. */
const permitChallenge = {
  nonce: 'abc',
  payload: '{"types":{}}',
  expires_at: '2026-08-24T15:32:25Z',
  challenge_type: WALLET_CHALLENGE_TYPE.permit,
  digest: '0xdead',
  signature_expires_at: '2026-08-31T13:32:06Z',
};

beforeEach(() => {
  post.mockReset();
  post.mockResolvedValue({ data: permitChallenge });
});

describe('requestWalletChallenge', () => {
  it('sends no challenge_type by default, so the server picks the text challenge', async () => {
    post.mockResolvedValue({
      data: { nonce: 'n', payload: 'I have read', expires_at: 'x' },
    });

    await requestWalletChallenge(base);

    expect(post.mock.calls[0][1]).toEqual({ address, chain: base.chain });
  });

  it('sends the permit params under snake_case keys', async () => {
    await requestWalletChallenge({
      ...base,
      challengeType: WALLET_CHALLENGE_TYPE.permit,
      permit: { value: '99512', deadline: 1788183126 },
    });

    expect(post.mock.calls[0][1]).toEqual({
      address,
      chain: base.chain,
      challenge_type: 'WALLET_CHALLENGE_TYPE_PERMIT',
      permit: { value: '99512', deadline: 1788183126 },
    });
  });

  it('sends the fee-approval params under snake_case keys', async () => {
    post.mockResolvedValue({
      data: {
        ...permitChallenge,
        challenge_type: 'WALLET_CHALLENGE_TYPE_FEE_APPROVAL',
      },
    });

    await requestWalletChallenge({
      ...base,
      challengeType: WALLET_CHALLENGE_TYPE.feeApproval,
      feeApproval: { maxMintFee: '1000', expiry: 1788184394 },
    });

    expect(post.mock.calls[0][1]).toEqual({
      address,
      chain: base.chain,
      challenge_type: 'WALLET_CHALLENGE_TYPE_FEE_APPROVAL',
      fee_approval: { max_mint_fee: '1000', expiry: 1788184394 },
    });
  });

  it('maps digest, challengeType and signatureExpiresAt back to camelCase', async () => {
    const challenge = await requestWalletChallenge({
      ...base,
      challengeType: WALLET_CHALLENGE_TYPE.permit,
      permit: { value: '1', deadline: 1 },
    });

    expect(challenge).toEqual({
      nonce: 'abc',
      payload: '{"types":{}}',
      expiresAt: '2026-08-24T15:32:25Z',
      challengeType: 'WALLET_CHALLENGE_TYPE_PERMIT',
      digest: '0xdead',
      signatureExpiresAt: '2026-08-31T13:32:06Z',
    });
  });

  it('omits the typed-data fields when the server does not send them', async () => {
    post.mockResolvedValue({
      data: {
        nonce: 'n',
        payload: 'I have read',
        expires_at: 'x',
        signature_expires_at: null,
      },
    });

    const challenge = await requestWalletChallenge(base);

    expect(challenge).toEqual({
      nonce: 'n',
      payload: 'I have read',
      expiresAt: 'x',
    });
  });

  // Without params the gateway does not reject the request, it answers with the
  // plain-text challenge — which the wallet signs and the server then refuses.
  it('refuses a permit challenge with no permit params', async () => {
    await expect(
      requestWalletChallenge({
        ...base,
        challengeType: WALLET_CHALLENGE_TYPE.permit,
      }),
    ).rejects.toThrow('requires `permit` params');

    expect(post).not.toHaveBeenCalled();
  });

  it('refuses a fee-approval challenge with no fee-approval params', async () => {
    await expect(
      requestWalletChallenge({
        ...base,
        challengeType: WALLET_CHALLENGE_TYPE.feeApproval,
      }),
    ).rejects.toThrow('requires `feeApproval` params');

    expect(post).not.toHaveBeenCalled();
  });
});

describe('verifyWalletSignature', () => {
  beforeEach(() => {
    post.mockResolvedValue({
      data: {
        jwt: 'token',
        expires_at: 'later',
        verification_id: '',
        status: '',
      },
    });
  });

  it('repeats the challenge_type, which the challenge is keyed on', async () => {
    await verifyWalletSignature({
      ...base,
      payload: '{"types":{}}',
      signature: '0xsig',
      challengeType: WALLET_CHALLENGE_TYPE.permit,
    });

    expect(post.mock.calls[0][1]).toEqual({
      address,
      chain: base.chain,
      payload: '{"types":{}}',
      signature: '0xsig',
      challenge_type: 'WALLET_CHALLENGE_TYPE_PERMIT',
    });
  });

  it('omits challenge_type when none was used', async () => {
    await verifyWalletSignature({
      ...base,
      payload: 'I have read',
      signature: '0xsig',
    });

    expect(post.mock.calls[0][1]).not.toHaveProperty('challenge_type');
  });

  // Code 9 means the wallet already holds an active stake-and-bake signature.
  // Callers fall back to the plain challenge on it, so it has to be branchable
  // without matching on message text.
  it('raises a typed error when the wallet already has an active signature', async () => {
    post.mockRejectedValue(
      Object.assign(new Error('request failed'), {
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            code: 9,
            message:
              'an active signature is already stored for this wallet; sign in with a plain wallet challenge instead',
          },
        },
      }),
    );

    const caught = await verifyWalletSignature({
      ...base,
      payload: '{"types":{}}',
      signature: '0xsig',
      challengeType: WALLET_CHALLENGE_TYPE.permit,
    }).catch((e: unknown) => e);

    expect(caught).toBeInstanceOf(ActivePermitExistsError);
    expect(caught).toMatchObject({ code: 9 });
    expect(String(caught)).toContain('active signature is already stored');
  });

  it('leaves other failures as plain errors', async () => {
    post.mockRejectedValue(
      Object.assign(new Error('boom'), {
        isAxiosError: true,
        response: { status: 500, data: { code: 13, message: 'internal' } },
      }),
    );

    const caught = await verifyWalletSignature({
      ...base,
      payload: '{"types":{}}',
      signature: '0xsig',
    }).catch((e: unknown) => e);

    expect(caught).not.toBeInstanceOf(ActivePermitExistsError);
  });
});
