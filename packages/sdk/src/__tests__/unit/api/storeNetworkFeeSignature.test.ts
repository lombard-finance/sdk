import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  FeeSignatureAlreadyExistsError,
  storeNetworkFeeSignature,
} from '../../../api-functions/storeNetworkFeeSignature/storeNetworkFeeSignature';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('storeNetworkFeeSignature', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('resolves to "success" on a successful POST', async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({ data: { status: 'success' } });
    mockedAxios.isAxiosError = vi.fn(() => false) as unknown as typeof axios.isAxiosError;

    const result = await storeNetworkFeeSignature({
      signature: '0xsig',
      typedData: '{}',
      address: '0xabc',
    });

    expect(result).toBe('success');
  });

  it('throws FeeSignatureAlreadyExistsError when BFF returns code 6', async () => {
    const axiosErr = {
      isAxiosError: true,
      response: {
        data: {
          code: 6,
          message: 'Active signature already exists for this user',
        },
        status: 400,
      },
    };
    mockedAxios.post = vi.fn().mockRejectedValue(axiosErr);
    mockedAxios.isAxiosError = vi.fn(() => true) as unknown as typeof axios.isAxiosError;

    await expect(
      storeNetworkFeeSignature({
        signature: '0xsig',
        typedData: '{}',
        address: '0xabc',
      }),
    ).rejects.toBeInstanceOf(FeeSignatureAlreadyExistsError);
  });

  it('preserves the BFF message on FeeSignatureAlreadyExistsError', async () => {
    const axiosErr = {
      isAxiosError: true,
      response: {
        data: {
          code: 6,
          message: 'Active signature already exists for this user',
        },
      },
    };
    mockedAxios.post = vi.fn().mockRejectedValue(axiosErr);
    mockedAxios.isAxiosError = vi.fn(() => true) as unknown as typeof axios.isAxiosError;

    try {
      await storeNetworkFeeSignature({
        signature: '0xsig',
        typedData: '{}',
        address: '0xabc',
      });
      throw new Error('expected to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(FeeSignatureAlreadyExistsError);
      expect((err as Error).message).toBe(
        'Active signature already exists for this user',
      );
      expect((err as FeeSignatureAlreadyExistsError).code).toBe(6);
    }
  });

  it('throws a generic Error for non-code-6 axios failures', async () => {
    const axiosErr = {
      isAxiosError: true,
      response: { data: { code: 99, message: 'something else' } },
    };
    mockedAxios.post = vi.fn().mockRejectedValue(axiosErr);
    mockedAxios.isAxiosError = vi.fn(() => true) as unknown as typeof axios.isAxiosError;

    await expect(
      storeNetworkFeeSignature({
        signature: '0xsig',
        typedData: '{}',
        address: '0xabc',
      }),
    ).rejects.not.toBeInstanceOf(FeeSignatureAlreadyExistsError);
  });
});
