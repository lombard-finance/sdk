import { afterEach, describe, expect, it, vi } from 'vitest';

// The api-functions now reach the network through `utils/http`, which calls the
// axios *default export* as a function rather than `axios.post`. Mocking the
// module keeps this test asserting on the same boundary it always did — what
// goes out, and how a BFF error code comes back — rather than on the transport.
const { axiosFn, isAxiosErrorFn } = vi.hoisted(() => ({
  axiosFn: vi.fn(),
  isAxiosErrorFn: vi.fn(),
}));
vi.mock('axios', () => ({ default: axiosFn, isAxiosError: isAxiosErrorFn }));

import {
  FeeSignatureAlreadyExistsError,
  storeNetworkFeeSignature,
} from '../../../api-functions/storeNetworkFeeSignature/storeNetworkFeeSignature';

describe('storeNetworkFeeSignature', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('resolves to "success" on a successful POST', async () => {
    axiosFn.mockResolvedValue({
      data: { status: 'success' },
      status: 200,
      headers: {},
    });
    isAxiosErrorFn.mockReturnValue(false);

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
    axiosFn.mockRejectedValue(axiosErr);
    isAxiosErrorFn.mockReturnValue(true);

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
    axiosFn.mockRejectedValue(axiosErr);
    isAxiosErrorFn.mockReturnValue(true);

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
    axiosFn.mockRejectedValue(axiosErr);
    isAxiosErrorFn.mockReturnValue(true);

    await expect(
      storeNetworkFeeSignature({
        signature: '0xsig',
        typedData: '{}',
        address: '0xabc',
      }),
    ).rejects.not.toBeInstanceOf(FeeSignatureAlreadyExistsError);
  });
});
