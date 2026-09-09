/**
 * What the address-generation route does with a 200 that carries no address.
 *
 * The value it returns is handed to the caller as the Bitcoin address to send
 * a deposit to, and its type says `string`. Both sibling routes —
 * `getDepositBtcAddress` and `resolveDepositBtcAddress` — already refuse a
 * response without one; this route returned it as it came.
 */

import { Env } from '@lombard.finance/sdk-common';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateDepositBtcAddress } from '../../../api-functions/generateDepositBtcAddress';
import { ChainId } from '../../../common/chains';
import { Token } from '../../../tokens/token-addresses';

vi.mock('axios');

// LBTC is one of the tokens whose adapter address is looked up before the
// request is built, and that read goes to an RPC. Stubbed so these stay
// offline; the address it resolves to is not what is under test.
vi.mock('../../../tokens/tokens', () => ({
  getTokenContractInfo: vi.fn().mockResolvedValue({
    address: '0x8236a87084f8b84306f72007f36f2618a5634494',
    abi: [],
  }),
}));

const mockedPost = vi.mocked(axios.post);

const params = {
  address: '0x1111111111111111111111111111111111111111',
  chainId: ChainId.ethereum,
  signature: '0xsignature',
  token: Token.LBTC,
  env: Env.prod,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('generateDepositBtcAddress', () => {
  it('returns the address the route issued', async () => {
    mockedPost.mockResolvedValue({
      data: { address: 'bc1qzyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3h8ffkz' },
    });

    await expect(generateDepositBtcAddress(params)).resolves.toBe(
      'bc1qzyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3h8ffkz',
    );
  });

  it.each([
    ['an empty body', {}],
    ['an empty address', { address: '' }],
    ['a null address', { address: null }],
  ])('refuses %s rather than returning it', async (_label, data) => {
    mockedPost.mockResolvedValue({ data });

    await expect(generateDepositBtcAddress(params)).rejects.toThrow(
      /returned no address/,
    );
  });

  // The sanctions refusal is reported as an error and answered with a
  // sentinel, so the new check must not sit in front of it.
  it('still answers the sanctions refusal with the sentinel', async () => {
    // Shaped as axios rejects: an Error carrying `response`, which is what
    // getErrorMessage reads the body out of.
    const rejection = Object.assign(new Error('Request failed'), {
      response: {
        data: { message: 'destination address is under sanctions' },
      },
    });
    mockedPost.mockRejectedValue(rejection);

    await expect(generateDepositBtcAddress(params)).resolves.toBe(
      'sanctioned_address',
    );
  });
});
