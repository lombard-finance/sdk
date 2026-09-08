import { Env, WALLET_CHALLENGE_TYPE } from '@lombard.finance/sdk-common';
import type { EIP1193Provider } from 'viem';
import { hashTypedData } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getUserStakeAndBakeSignature } from '../../../api-functions/getUserStakeAndBakeSignature';
import { pollWalletVerification } from '../../../api-functions/walletAuth/pollWalletVerification';
import { requestWalletChallenge } from '../../../api-functions/walletAuth/requestWalletChallenge';
import { verifyWalletSignature } from '../../../api-functions/walletAuth/verifyWalletSignature';
import { ChainId } from '../../../common/chains';
import { signPermitChallenge } from '../../../contract-functions/signPermitChallenge';
import { ActivePermitExistsError } from '../../../utils/err';

vi.mock('../../../api-functions/getUserStakeAndBakeSignature');
vi.mock('../../../api-functions/walletAuth/requestWalletChallenge');
vi.mock('../../../api-functions/walletAuth/verifyWalletSignature');
vi.mock('../../../api-functions/walletAuth/pollWalletVerification');

const mockedStored = vi.mocked(getUserStakeAndBakeSignature);
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
  mockedStored.mockRejectedValue(new Error('no stored signature'));
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

/**
 * A wallet already holding an active signature is the default state for a
 * returning user, for the whole lifetime of their previous permit. The gateway
 * issues a permit challenge anyway and only refuses at verify, so without a
 * pre-check the user signs a real mainnet permit that is then discarded.
 */
describe('signPermitChallenge with an active signature on file', () => {
  const future = () => String(Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60);

  function onFile(expirationDate: string) {
    mockedStored.mockResolvedValue({
      userDestinationAddress: account,
      signature: '0xstored',
      expirationDate,
      depositAmount: '99512',
      chainId: '1',
    });
  }

  it('fails before the wallet is prompted', async () => {
    onFile(future());

    await expect(signPermitChallenge(params)).rejects.toThrow(
      ActivePermitExistsError,
    );
    expect(request).not.toHaveBeenCalled();
    expect(mockedChallenge).not.toHaveBeenCalled();
  });

  it('reports when the existing signature lapses, so callers can say when to retry', async () => {
    const expiresAt = future();
    onFile(expiresAt);

    await expect(signPermitChallenge(params)).rejects.toMatchObject({
      code: 9,
      expiresAt,
    });
  });

  it('proceeds once the stored signature has elapsed', async () => {
    onFile(String(Math.floor(Date.now() / 1000) - 60));

    await expect(signPermitChallenge(params)).resolves.toMatchObject({
      jwt: 'jwt-token',
    });
  });

  it('proceeds when the record is empty', async () => {
    mockedStored.mockResolvedValue({
      userDestinationAddress: account,
      signature: '',
      expirationDate: '',
      depositAmount: '',
      chainId: '1',
    });

    await expect(signPermitChallenge(params)).resolves.toMatchObject({
      jwt: 'jwt-token',
    });
  });

  // Blocking a first-time user because an unrelated endpoint is down would be
  // a worse trade than the wasted prompt the check exists to avoid.
  it('proceeds when the lookup itself fails', async () => {
    mockedStored.mockRejectedValue(new Error('gateway unreachable'));

    await expect(signPermitChallenge(params)).resolves.toMatchObject({
      jwt: 'jwt-token',
    });
  });
});

/**
 * The permit is assembled server-side, which is not the same as its contents
 * being trustworthy. Every field the caller already holds is compared to the
 * document before the wallet is asked to sign it.
 */
describe('signPermitChallenge payload checks', () => {
  /** A challenge carrying `overrides` applied to the reference document. */
  function challengeWith(
    overrides: {
      primaryType?: string;
      types?: Record<string, Array<{ name: string; type: string }>>;
      domain?: Partial<Record<keyof typeof typedData.domain, string | number>>;
      message?: Partial<Record<keyof typeof typedData.message, string>>;
    },
    options: { withDigest?: boolean } = {},
  ) {
    const doc = {
      ...typedData,
      ...overrides,
      domain: { ...typedData.domain, ...overrides.domain },
      message: { ...typedData.message, ...overrides.message },
    };
    const docPayload = JSON.stringify(doc);
    const { EIP712Domain: _domain, ...docTypes } = doc.types;

    mockedChallenge.mockResolvedValue({
      nonce: 'abc',
      payload: docPayload,
      expiresAt: 'x',
      challengeType: WALLET_CHALLENGE_TYPE.permit,
      ...(options.withDigest
        ? {
            digest: hashTypedData({
              domain: doc.domain,
              types: docTypes,
              primaryType: doc.primaryType,
              message: doc.message,
            } as Parameters<typeof hashTypedData>[0]),
          }
        : {}),
    });
  }

  // The digest check hashes the server's payload and compares it to the
  // server's own digest, so the two agreeing says nothing about what the
  // document authorises. This is the case that check cannot catch.
  it('refuses a foreign spender even when the reserved digest matches', async () => {
    challengeWith(
      { message: { spender: '0x00000000000000000000000000000000000000ff' } },
      { withDigest: true },
    );

    await expect(signPermitChallenge(params)).rejects.toMatchObject({
      name: 'PermitChallengeMismatchError',
      field: 'message.spender',
    });
    expect(request).not.toHaveBeenCalled();
    expect(mockedVerify).not.toHaveBeenCalled();
  });

  it('refuses a value above the one that was asked for', async () => {
    challengeWith({
      message: {
        value:
          '115792089237316195423570985008687907853269984665640564039457584007913129639935',
      },
    });

    await expect(signPermitChallenge(params)).rejects.toMatchObject({
      field: 'message.value',
    });
    expect(request).not.toHaveBeenCalled();
  });

  it('refuses a deadline beyond the one that was asked for', async () => {
    challengeWith({ message: { deadline: '99999999999' } });

    await expect(
      signPermitChallenge({ ...params, deadline: 1788183126 }),
    ).rejects.toMatchObject({ field: 'message.deadline' });
    expect(request).not.toHaveBeenCalled();
  });

  // The server is allowed to shorten what it was asked for; only going over is
  // a mismatch.
  it('accepts a deadline the server shortened', async () => {
    challengeWith({ message: { deadline: '1788183120' } });

    await expect(
      signPermitChallenge({ ...params, deadline: 1788183126 }),
    ).resolves.toMatchObject({ jwt: 'jwt-token' });
  });

  it('refuses a token other than the one the SDK knows for the chain', async () => {
    challengeWith({
      domain: {
        verifyingContract: '0x00000000000000000000000000000000000000ff',
      },
    });

    await expect(signPermitChallenge(params)).rejects.toMatchObject({
      field: 'domain.verifyingContract',
    });
    expect(request).not.toHaveBeenCalled();
  });

  it('refuses a domain bound to another chain', async () => {
    challengeWith({ domain: { chainId: 8453 } });

    await expect(signPermitChallenge(params)).rejects.toMatchObject({
      field: 'domain.chainId',
    });
    expect(request).not.toHaveBeenCalled();
  });

  it('refuses an owner other than the account that will sign', async () => {
    challengeWith({
      message: { owner: '0x00000000000000000000000000000000000000ff' },
    });

    await expect(signPermitChallenge(params)).rejects.toMatchObject({
      field: 'message.owner',
    });
    expect(request).not.toHaveBeenCalled();
  });

  // `primaryType` and `types` are as substitutable as any other field: a
  // Permit2 batch or a Safe transaction would otherwise be signed under the
  // label of a permit challenge.
  it('refuses a document that is not an ERC-2612 permit', async () => {
    challengeWith({ primaryType: 'PermitBatch' });

    await expect(signPermitChallenge(params)).rejects.toMatchObject({
      field: 'primaryType',
    });
    expect(request).not.toHaveBeenCalled();
  });

  it('refuses a Permit struct whose fields differ from ERC-2612', async () => {
    challengeWith({
      types: {
        ...typedData.types,
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'extra', type: 'address' },
        ],
      },
    });

    await expect(signPermitChallenge(params)).rejects.toMatchObject({
      field: 'types.Permit',
    });
    expect(request).not.toHaveBeenCalled();
  });

  it('accepts the checksummed form of an address held in lower case', async () => {
    // The SDK holds the prod Ethereum LBTC address lower case; the gateway
    // issues it checksummed. Casing is not part of an address.
    await expect(signPermitChallenge(params)).resolves.toMatchObject({
      jwt: 'jwt-token',
    });
  });

  it('reports the payload rather than the parse error when it is not JSON', async () => {
    mockedChallenge.mockResolvedValue({
      nonce: 'abc',
      payload: 'not json',
      expiresAt: 'x',
      challengeType: WALLET_CHALLENGE_TYPE.permit,
    });

    await expect(signPermitChallenge(params)).rejects.toMatchObject({
      field: 'payload',
    });
    expect(request).not.toHaveBeenCalled();
  });
});

/**
 * The spender comes from the SDK's own vault registry, so a chain the registry
 * has no entry for leaves nothing to compare the document against.
 */
describe('signPermitChallenge on a chain the registry does not carry', () => {
  const onBase = { ...params, chainId: ChainId.base };

  it('refuses rather than trusting the issued spender', async () => {
    await expect(signPermitChallenge(onBase)).rejects.toMatchObject({
      field: 'message.spender',
    });
    expect(request).not.toHaveBeenCalled();
  });

  it('proceeds when the caller names the spender to expect', async () => {
    const spender = '0xC8bbF6153D7Ba105f1399D992ebd32B0541996ef' as const;
    const doc = {
      ...typedData,
      domain: {
        ...typedData.domain,
        chainId: ChainId.base,
        verifyingContract: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
      },
      message: { ...typedData.message, spender },
    };

    mockedChallenge.mockResolvedValue({
      nonce: 'abc',
      payload: JSON.stringify(doc),
      expiresAt: 'x',
      challengeType: WALLET_CHALLENGE_TYPE.permit,
    });

    await expect(
      signPermitChallenge({ ...onBase, expectedSpender: spender }),
    ).resolves.toMatchObject({ jwt: 'jwt-token' });
  });
});

describe('signPermitChallenge wallet rejection', () => {
  // Wallets reject with an EIP-1193 object rather than an Error, so an
  // unwrapped rejection reaches callers as `[object Object]`.
  it('wraps an EIP-1193 rejection in a real Error', async () => {
    request.mockRejectedValue({
      code: 4001,
      message: 'User rejected the request',
    });

    const caught = await signPermitChallenge(params).catch((e: unknown) => e);

    expect(caught).toBeInstanceOf(Error);
    expect(String(caught)).toContain('User rejected the request');
    expect(String(caught)).not.toContain('[object Object]');
  });
});
