/**
 * A server-issued fee approval is checked against the request before the
 * wallet signs it.
 *
 * `requestWalletChallenge({ challengeType: feeApproval })` returns EIP-712
 * built by the server, and the docs used to say to sign what was given. A
 * tampered response could then put a permit for another spender, or a fee
 * the size of a deposit, in front of the wallet under the name of a fee
 * approval. `signFeeApprovalChallenge` pins it as `signPermitChallenge` pins
 * a permit, and `assertFeeApprovalPayloadMatches` is the same check for a
 * challenge requested by hand.
 */

import { Env, WALLET_CHALLENGE_TYPE } from '@lombard.finance/sdk-common';
import type { EIP1193Provider } from 'viem';
import { hashTypedData } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pollWalletVerification } from '../../../api-functions/walletAuth/pollWalletVerification';
import { requestWalletChallenge } from '../../../api-functions/walletAuth/requestWalletChallenge';
import { verifyWalletSignature } from '../../../api-functions/walletAuth/verifyWalletSignature';
import { ChainId } from '../../../common/chains';
import {
  assertFeeApprovalPayloadMatches,
  signFeeApprovalChallenge,
} from '../../../contract-functions/signFeeApprovalChallenge';
import { Token } from '../../../tokens/token-addresses';
import { FeeApprovalChallengeMismatchError } from '../../../utils/err';

vi.mock('../../../api-functions/walletAuth/requestWalletChallenge');
vi.mock('../../../api-functions/walletAuth/verifyWalletSignature');
vi.mock('../../../api-functions/walletAuth/pollWalletVerification');

const mockedChallenge = vi.mocked(requestWalletChallenge);
const mockedVerify = vi.mocked(verifyWalletSignature);
const mockedPoll = vi.mocked(pollWalletVerification);

const account = '0xde51ec5d10484a21ec0b9d7c60d76a95977da29f' as const;
/** Prod LBTC and BTC.b on Ethereum, the contracts an approval is signed on. */
const LBTC = '0x8236a87084f8B84306f72007F36F2618A5634494';
const BTCB = '0xB0F70C0bD6FD87dbEb7C10dC692a2a6106817072';

const REQUESTED_EXPIRY = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
const MAX_FEE = '473';

/** A fee-approval document shaped as `signNetworkFee` builds one. */
function feeApproval({
  domain = {},
  message = {},
  primaryType = 'feeApproval',
  types,
}: {
  domain?: Record<string, unknown>;
  message?: Record<string, unknown>;
  primaryType?: string;
  types?: Record<string, unknown>;
} = {}) {
  return {
    types: types ?? {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      feeApproval: [
        { name: 'chainId', type: 'uint256' },
        { name: 'fee', type: 'uint256' },
        { name: 'expiry', type: 'uint256' },
      ],
    },
    primaryType,
    domain: {
      name: 'Lombard Staked Bitcoin',
      version: '1',
      chainId: 1,
      verifyingContract: LBTC,
      ...domain,
    },
    message: {
      chainId: '1',
      fee: MAX_FEE,
      expiry: String(REQUESTED_EXPIRY - 60),
      ...message,
    },
  };
}

function digestOf(document: ReturnType<typeof feeApproval>): string {
  const { EIP712Domain: _domain, ...types } = document.types as Record<
    string,
    unknown
  >;
  return hashTypedData({
    domain: document.domain,
    types,
    primaryType: document.primaryType,
    message: document.message,
  } as Parameters<typeof hashTypedData>[0]);
}

function serverIssues(document: ReturnType<typeof feeApproval>) {
  const payload = JSON.stringify(document);
  mockedChallenge.mockResolvedValue({
    nonce: 'abc',
    payload,
    expiresAt: '2026-11-06T15:32:25Z',
    challengeType: WALLET_CHALLENGE_TYPE.feeApproval,
    digest: digestOf(document),
    signatureExpiresAt: '2026-11-07T13:32:06Z',
  });
  return payload;
}

const request = vi.fn();
const provider = { request } as unknown as EIP1193Provider;

const params = {
  account,
  chainId: ChainId.ethereum,
  provider,
  maxMintFee: MAX_FEE,
  expiry: REQUESTED_EXPIRY,
  env: Env.prod,
};

beforeEach(() => {
  vi.resetAllMocks();
  request.mockResolvedValue('0xsignature');
  mockedVerify.mockResolvedValue({
    kind: 'complete',
    jwt: 'jwt-token',
    expiresAt: '2026-11-13T13:33:02Z',
  });
});

describe('signFeeApprovalChallenge', () => {
  it('asks for an LBTC fee approval, signs the payload as it arrived, and verifies it', async () => {
    const payload = serverIssues(feeApproval());

    const result = await signFeeApprovalChallenge(params);

    expect(mockedChallenge).toHaveBeenCalledWith(
      expect.objectContaining({
        address: account,
        challengeType: WALLET_CHALLENGE_TYPE.feeApproval,
        feeApproval: {
          maxMintFee: MAX_FEE,
          expiry: REQUESTED_EXPIRY,
          // The address book spells it in lower case.
          token: LBTC.toLowerCase(),
        },
      }),
    );
    expect(request).toHaveBeenCalledWith({
      method: 'eth_signTypedData_v4',
      params: [account, payload],
    });
    expect(mockedVerify).toHaveBeenCalledWith(
      expect.objectContaining({
        challengeType: WALLET_CHALLENGE_TYPE.feeApproval,
        payload,
        signature: '0xsignature',
      }),
    );
    expect(result).toEqual({
      jwt: 'jwt-token',
      expiresAt: '2026-11-13T13:33:02Z',
      payload,
      signature: '0xsignature',
      signatureExpiresAt: '2026-11-07T13:32:06Z',
    });
  });

  it('names the BTC.b contract for a BTC.b approval and pins it', async () => {
    serverIssues(feeApproval({ domain: { verifyingContract: BTCB } }));

    await signFeeApprovalChallenge({ ...params, token: Token.BTCb });

    expect(mockedChallenge).toHaveBeenCalledWith(
      expect.objectContaining({
        feeApproval: expect.objectContaining({ token: BTCB }),
      }),
    );
    expect(request).toHaveBeenCalled();
  });

  it('polls when verification is pending', async () => {
    serverIssues(feeApproval());
    mockedVerify.mockResolvedValue({ kind: 'pending', verificationId: 'v1' });
    mockedPoll.mockResolvedValue({ jwt: 'late', expiresAt: 'x' });

    await expect(signFeeApprovalChallenge(params)).resolves.toMatchObject({
      jwt: 'late',
    });
  });

  // The cases a tampered response would use, none of which reach the wallet.
  it.each([
    [
      'a permit to another spender',
      feeApproval({
        primaryType: 'Permit',
        types: {
          Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
          ],
        },
        message: {
          owner: account,
          spender: '0x000000000000000000000000000000000000dEaD',
          value: '100000000',
          nonce: '0',
          deadline: String(REQUESTED_EXPIRY),
        },
      }),
      'primaryType',
    ],
    [
      'a fee above the one asked for',
      feeApproval({ message: { fee: '100000' } }),
      'message.fee',
    ],
    ['a zero fee', feeApproval({ message: { fee: '0' } }), 'message.fee'],
    [
      'another chain in the domain',
      feeApproval({ domain: { chainId: 8453 } }),
      'domain.chainId',
    ],
    [
      'another chain in the message',
      feeApproval({ message: { chainId: '8453' } }),
      'message.chainId',
    ],
    [
      'another contract',
      feeApproval({ domain: { verifyingContract: BTCB } }),
      'domain.verifyingContract',
    ],
    [
      'an expiry later than asked',
      feeApproval({ message: { expiry: String(REQUESTED_EXPIRY + 1) } }),
      'message.expiry',
    ],
    [
      'an expiry already past',
      feeApproval({ message: { expiry: '1000' } }),
      'message.expiry',
    ],
    [
      'the struct fields reordered',
      feeApproval({
        types: {
          feeApproval: [
            { name: 'fee', type: 'uint256' },
            { name: 'chainId', type: 'uint256' },
            { name: 'expiry', type: 'uint256' },
          ],
        },
      }),
      'types.feeApproval',
    ],
  ])('refuses %s before the wallet is asked', async (_label, doc, field) => {
    serverIssues(doc as ReturnType<typeof feeApproval>);

    await expect(signFeeApprovalChallenge(params)).rejects.toMatchObject({
      name: 'FeeApprovalChallengeMismatchError',
      field,
    });
    expect(request).not.toHaveBeenCalled();
    expect(mockedVerify).not.toHaveBeenCalled();
  });

  it('refuses a payload whose digest is not the one reserved', async () => {
    mockedChallenge.mockResolvedValue({
      nonce: 'abc',
      payload: JSON.stringify(feeApproval()),
      expiresAt: '2026-11-06T15:32:25Z',
      challengeType: WALLET_CHALLENGE_TYPE.feeApproval,
      digest: `0x${'00'.repeat(32)}`,
    });

    await expect(signFeeApprovalChallenge(params)).rejects.toThrow(
      /Fee approval challenge digest mismatch/,
    );
    expect(request).not.toHaveBeenCalled();
  });

  it('refuses a plain-text challenge the gateway fell back to', async () => {
    serverIssues(feeApproval());
    mockedChallenge.mockResolvedValue({
      nonce: 'abc',
      payload: 'Sign in to Lombard',
      expiresAt: '2026-11-06T15:32:25Z',
    });

    await expect(signFeeApprovalChallenge(params)).rejects.toThrow(
      /Expected a fee approval challenge/,
    );
    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    ['zero', '0'],
    ['above the cap', '100001'],
  ])('refuses a requested fee of %s before any request', async (_l, fee) => {
    await expect(
      signFeeApprovalChallenge({ ...params, maxMintFee: fee }),
    ).rejects.toThrow(/minting fee/);
    expect(mockedChallenge).not.toHaveBeenCalled();
  });
});

describe('assertFeeApprovalPayloadMatches', () => {
  const expected = {
    chainId: ChainId.ethereum,
    maxMintFee: MAX_FEE,
    expiry: REQUESTED_EXPIRY,
    env: Env.prod,
  };

  it('accepts the approval that was asked for, with a lower fee and expiry', () => {
    const document = feeApproval({
      message: { fee: '400', expiry: String(REQUESTED_EXPIRY - 3600) },
    });

    expect(() =>
      assertFeeApprovalPayloadMatches(JSON.stringify(document), expected),
    ).not.toThrow();
  });

  it('matches the contract regardless of case', () => {
    const document = feeApproval({
      domain: { verifyingContract: LBTC.toLowerCase() },
    });

    expect(() =>
      assertFeeApprovalPayloadMatches(JSON.stringify(document), expected),
    ).not.toThrow();
  });

  it('refuses a payload that is not typed data', () => {
    expect(() =>
      assertFeeApprovalPayloadMatches('Sign in to Lombard', expected),
    ).toThrow(FeeApprovalChallengeMismatchError);
  });
});
