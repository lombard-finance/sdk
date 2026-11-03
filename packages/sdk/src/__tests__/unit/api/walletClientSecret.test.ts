import {
  Env,
  VERIFICATION_STATUS,
  WALLET_CHALLENGE_TYPE,
} from '@lombard.finance/sdk-common';
import axios, { type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pollWalletVerification } from '../../../api-functions/walletAuth/pollWalletVerification';
import { requestWalletChallenge } from '../../../api-functions/walletAuth/requestWalletChallenge';
import { verifyWalletSignature } from '../../../api-functions/walletAuth/verifyWalletSignature';
import {
  getApiConfig,
  WALLET_AUTH_REQUEST_TIMEOUT_MS,
} from '../../../common/api-config';
import { WalletAuthService } from '../../../services/WalletAuthService';

const base = { address: '0x123', chain: 'BLOCKCHAIN_ETHEREUM', env: Env.stage };
const originalAdapter = axios.defaults.adapter;
const requests: InternalAxiosRequestConfig[] = [];
const responses: unknown[] = [];
const token = {
  status: VERIFICATION_STATUS.completeValid,
  jwt: 'token',
  expires_at: 'later',
};

beforeEach(() => {
  requests.length = 0;
  responses.length = 0;
  axios.defaults.adapter = async (config) => {
    requests.push(config);
    if (!responses.length) throw new Error('Unexpected request');
    return {
      data: responses.shift(),
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };
});

afterEach(() => {
  axios.defaults.adapter = originalAdapter;
  vi.useRealTimers();
});

describe('wallet challenge clientSecret', () => {
  it.each([undefined, '', 'example-client-secret'])(
    'maps the challenge field %j and preserves the challenge request',
    async (clientSecret) => {
      responses.push({
        nonce: 'n',
        payload: 'message',
        expires_at: 'later',
        client_secret: clientSecret,
      });
      const result = await requestWalletChallenge(base);
      expect(result).toEqual({
        nonce: 'n',
        payload: 'message',
        expiresAt: 'later',
        ...(clientSecret ? { clientSecret } : {}),
      });
      expect(requests[0]).toMatchObject({
        method: 'post',
        url: 'v2/auth/wallet/challenge',
        data: '{"address":"0x123","chain":"BLOCKCHAIN_ETHEREUM"}',
        baseURL: getApiConfig(base.env).baseApiV2Url,
        timeout: WALLET_AUTH_REQUEST_TIMEOUT_MS,
      });
    },
  );

  it.each([undefined, ''])(
    'preserves verify request bytes without a nonempty secret (%j)',
    async (clientSecret) => {
      responses.push(token, token);
      await verifyWalletSignature({
        ...base,
        payload: 'message',
        signature: '0xsig',
        clientSecret,
      });
      expect(requests[0]).toMatchObject({
        method: 'post',
        url: 'v2/auth/wallet/verify',
        data: '{"address":"0x123","payload":"message","signature":"0xsig","chain":"BLOCKCHAIN_ETHEREUM"}',
        baseURL: getApiConfig(base.env).baseApiV2Url,
        timeout: WALLET_AUTH_REQUEST_TIMEOUT_MS,
      });
      await verifyWalletSignature({
        ...base,
        payload: 'message',
        signature: '0xsig',
        publicKey: 'key',
        challengeType: WALLET_CHALLENGE_TYPE.permit,
        clientSecret,
      });
      expect(requests[1].data).toBe(
        '{"address":"0x123","payload":"message","signature":"0xsig","chain":"BLOCKCHAIN_ETHEREUM","public_key":"key","challenge_type":"WALLET_CHALLENGE_TYPE_PERMIT"}',
      );
    },
  );

  it.each([undefined, ''])(
    'preserves the GET poll without a nonempty secret (%j)',
    async (clientSecret) => {
      responses.push(token);
      await expect(
        pollWalletVerification({
          verificationId: 'ticket',
          env: base.env,
          clientSecret,
        }),
      ).resolves.toEqual({ jwt: 'token', expiresAt: 'later' });
      expect(requests[0]).toMatchObject({
        method: 'get',
        url: 'v2/auth/wallet/verify/ticket',
        baseURL: getApiConfig(base.env).baseApiV2Url,
        timeout: WALLET_AUTH_REQUEST_TIMEOUT_MS,
      });
      expect(requests[0].data).toBeUndefined();
      expect(requests[0].params).toBeUndefined();
    },
  );

  it('carries the secret through the service into verify and every status poll', async () => {
    vi.useFakeTimers();
    responses.push(
      {
        nonce: 'n',
        payload: 'message',
        expires_at: 'later',
        client_secret: 'example-client-secret',
      },
      { status: VERIFICATION_STATUS.pending, verification_id: 'ticket' },
      { status: VERIFICATION_STATUS.pending },
      token,
    );
    const service = new WalletAuthService(base.env);
    const challenge = await service.requestChallenge(base);
    const verification = await service.verifySignature({
      ...base,
      payload: challenge.payload,
      signature: '0xsig',
      clientSecret: challenge.clientSecret,
    });
    expect(verification).toEqual({ kind: 'pending', verificationId: 'ticket' });
    expect(requests[1].data).toBe(
      '{"address":"0x123","payload":"message","signature":"0xsig","chain":"BLOCKCHAIN_ETHEREUM","client_secret":"example-client-secret"}',
    );
    const result = service.pollVerification({
      verificationId: 'ticket',
      clientSecret: challenge.clientSecret,
    });
    await vi.advanceTimersByTimeAsync(2_000);
    await expect(result).resolves.toEqual({ jwt: 'token', expiresAt: 'later' });
    expect(requests).toHaveLength(4);
    for (const request of requests.slice(2)) {
      expect(request).toMatchObject({
        method: 'post',
        url: 'v2/auth/wallet/verify/ticket/status',
        data: '{"client_secret":"example-client-secret"}',
        baseURL: getApiConfig(base.env).baseApiV2Url,
        timeout: WALLET_AUTH_REQUEST_TIMEOUT_MS,
      });
      expect(request.params).toBeUndefined();
    }
  });

  it('returns synchronous verification with a secret', async () => {
    responses.push(token);
    await expect(
      verifyWalletSignature({
        ...base,
        payload: 'message',
        signature: '0xsig',
        clientSecret: 'example-client-secret',
      }),
    ).resolves.toEqual({ kind: 'complete', jwt: 'token', expiresAt: 'later' });
    expect(JSON.parse(requests[0].data)).toHaveProperty(
      'client_secret',
      'example-client-secret',
    );
  });

  it('keeps status failures on the POST path', async () => {
    responses.push({
      status: 'VERIFICATION_STATUS_FAILED',
      error_code: 'invalid_signature',
    });
    await expect(
      pollWalletVerification({
        verificationId: 'ticket',
        env: base.env,
        clientSecret: 'example-client-secret',
      }),
    ).rejects.toThrow('Wallet verification failed: invalid_signature');
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('post');
  });
});
