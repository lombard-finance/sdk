import { Env, WALLET_CHALLENGE_TYPE } from '@lombard.finance/sdk-common';
import type { EIP1193Provider } from 'viem';
import { hashTypedData } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pollWalletVerification } from '../../../api-functions/walletAuth/pollWalletVerification';
import { requestWalletChallenge } from '../../../api-functions/walletAuth/requestWalletChallenge';
import { verifyWalletSignature } from '../../../api-functions/walletAuth/verifyWalletSignature';
import { ChainId } from '../../../common/chains';
import { signPermitChallenge } from '../../../contract-functions/signPermitChallenge';

vi.mock('../../../api-functions/walletAuth/requestWalletChallenge');
vi.mock('../../../api-functions/walletAuth/verifyWalletSignature');
vi.mock('../../../api-functions/walletAuth/pollWalletVerification');

const mockedChallenge = vi.mocked(requestWalletChallenge);
const mockedVerify = vi.mocked(verifyWalletSignature);
const mockedPoll = vi.mocked(pollWalletVerification);

const account = '0xde51ec5d10484a21ec0b9d7c60d76a95977da29f' as const;

/** A permit document shaped exactly as the gateway issues it. */
const typedData = {
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  },
  primaryType: 'Permit',
  domain: {
    name: 'Lombard Staked Bitcoin',
    version: '1',
    chainId: 1,
    verifyingContract: '0x8236a87084f8B84306f72007F36F2618A5634494',
  },
  message: {
    deadline: '1788183126',
    nonce: '8',
    owner: account,
    spender: '0xC8bbF6153D7Ba105f1399D992ebd32B0541996ef',
    value: '99512',
  },
};

const payload = JSON.stringify(typedData);
const { EIP712Domain: _unused, ...permitTypes } = typedData.types;
const digest = hashTypedData({
  domain: typedData.domain,
  types: permitTypes,
  primaryType: 'Permit',
  message: typedData.message,
} as Parameters<typeof hashTypedData>[0]);

const request = vi.fn();
const provider = { request } as unknown as EIP1193Provider;

const params = {
  account,
  chainId: ChainId.ethereum,
  provider,
  value: '99512',
  env: Env.prod,
};

beforeEach(() => {
  vi.resetAllMocks();
  request.mockResolvedValue('0xsignature');
  mockedChallenge.mockResolvedValue({
    nonce: 'abc',
    payload,
    expiresAt: '2026-08-24T15:32:25Z',
    challengeType: WALLET_CHALLENGE_TYPE.permit,
    digest,
    signatureExpiresAt: '2026-08-31T13:32:06Z',
  });
  mockedVerify.mockResolvedValue({
    kind: 'complete',
    jwt: 'jwt-token',
    expiresAt: '2026-08-31T13:33:02Z',
  });
});

describe('signPermitChallenge', () => {
  it('asks for a permit challenge and returns the JWT with the permit deadline', async () => {
    const result = await signPermitChallenge(params);

    expect(mockedChallenge).toHaveBeenCalledWith(
      expect.objectContaining({
        address: account,
        chain: 'BLOCKCHAIN_ETHEREUM',
        challengeType: 'WALLET_CHALLENGE_TYPE_PERMIT',
        permit: expect.objectContaining({ value: '99512' }),
      }),
    );

    expect(result).toEqual({
      jwt: 'jwt-token',
      expiresAt: '2026-08-31T13:33:02Z',
      payload,
      signature: '0xsignature',
      signatureExpiresAt: '2026-08-31T13:32:06Z',
    });
  });

  // The whole point of the helper: re-serialising the document can move the
  // digest off the one the server reserved, so the exact string goes through.
  it('hands the wallet the payload string exactly as it arrived', async () => {
    await signPermitChallenge(params);

    expect(request).toHaveBeenCalledWith({
      method: 'eth_signTypedData_v4',
      params: [account, payload],
    });
  });

  it('repeats the challenge type on verify', async () => {
    await signPermitChallenge(params);

    expect(mockedVerify).toHaveBeenCalledWith(
      expect.objectContaining({
        challengeType: 'WALLET_CHALLENGE_TYPE_PERMIT',
        payload,
        signature: '0xsignature',
      }),
    );
  });

  it('requests a seven-day deadline when none is given', async () => {
    const before = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

    await signPermitChallenge(params);

    const { permit } = mockedChallenge.mock.calls[0][0];
    expect(permit?.deadline).toBeGreaterThanOrEqual(before - 5);
    expect(permit?.deadline).toBeLessThanOrEqual(before + 5);
  });

  it('forwards an explicit deadline', async () => {
    await signPermitChallenge({ ...params, deadline: 1788183126 });

    expect(mockedChallenge.mock.calls[0][0].permit).toEqual({
      value: '99512',
      deadline: 1788183126,
    });
  });

  // A gateway that drops challenge_type answers with the text challenge, which
  // the wallet would sign and the server would then refuse.
  it('fails before prompting when the server issues a different challenge type', async () => {
    mockedChallenge.mockResolvedValue({
      nonce: 'abc',
      payload: 'I have read and accept the Terms of Service',
      expiresAt: 'x',
      challengeType: WALLET_CHALLENGE_TYPE.unspecified,
    });

    await expect(signPermitChallenge(params)).rejects.toThrow(
      'Expected a permit challenge',
    );
    expect(request).not.toHaveBeenCalled();
  });

  it('fails before prompting when the payload does not hash to the reserved digest', async () => {
    mockedChallenge.mockResolvedValue({
      nonce: 'abc',
      payload,
      expiresAt: 'x',
      challengeType: WALLET_CHALLENGE_TYPE.permit,
      digest:
        '0x00000000000000000000000000000000000000000000000000000000deadbeef',
    });

    await expect(signPermitChallenge(params)).rejects.toThrow(
      'digest mismatch',
    );
    expect(request).not.toHaveBeenCalled();
  });

  it('skips the digest check when the server sends none', async () => {
    mockedChallenge.mockResolvedValue({
      nonce: 'abc',
      payload,
      expiresAt: 'x',
      challengeType: WALLET_CHALLENGE_TYPE.permit,
    });

    await expect(signPermitChallenge(params)).resolves.toMatchObject({
      jwt: 'jwt-token',
    });
  });

  it('polls when verification is asynchronous', async () => {
    mockedVerify.mockResolvedValue({
      kind: 'pending',
      verificationId: 'verification-1',
    });
    mockedPoll.mockResolvedValue({
      jwt: 'polled-token',
      expiresAt: '2026-08-31T13:33:02Z',
    });

    const result = await signPermitChallenge(params);

    expect(mockedPoll).toHaveBeenCalledWith(
      expect.objectContaining({ verificationId: 'verification-1' }),
    );
    expect(result.jwt).toBe('polled-token');
  });

  it('rejects a wallet that answers with something other than a signature', async () => {
    request.mockResolvedValue(null);

    await expect(signPermitChallenge(params)).rejects.toThrow('no signature');
    expect(mockedVerify).not.toHaveBeenCalled();
  });
});
