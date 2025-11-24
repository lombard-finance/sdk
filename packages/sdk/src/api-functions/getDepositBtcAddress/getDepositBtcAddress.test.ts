import { describe, expect, it, type Mock, vi } from 'vitest';
vi.mock('./make-request', async () => {
  return {
    makeRequest: vi.fn(async () => undefined),
  };
});

import { getDepositBtcAddress } from './getDepositBtcAddress';
import { ChainId } from '../../common/chains';
import { Env } from '@lombard.finance/sdk-common';
import { getChainNameById } from '../../common/blockchain-identifier';
import { Token, TOKEN_ADDRESSES } from '../../tokens/token-addresses';
import { DAY, now, toUnix } from '../../utils/time';
import { makeRequest } from './make-request';
import { IDepositAddress, IGetDepositBtcAddressesParameters } from './types';

const ACCOUNT_ADDRESS_A = '0x1111111111111111111111111111111111111111';

const DEPOSIT_ADDRESS_A = 'bc1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const DEPOSIT_ADDRESS_B = 'bc1bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const DEPOSIT_ADDRESS_C = 'bc1ccccccccccccccccccccccccccccccccccccccc';

const makeDepositAddress = (
  depositAddress: string,
  chainId: ChainId,
  toAddress: string,
  createdAt: number,
  token?: Token,
) =>
  ({
    btc_address: depositAddress,
    type: 'ADDRESS_TYPE_DEPOSIT',
    deposit_metadata: {
      to_address: toAddress,
      to_blockchain: getChainNameById(chainId),
      referral: 'lombard',
      ...(token != null
        ? {
            token_address: TOKEN_ADDRESSES[token]?.[Env.prod]?.[chainId],
            aux_version: 1,
          }
        : {}),
    },
    created_at: createdAt.toString(),
  }) as IDepositAddress;

describe('getDepositBtcAddress', () => {
  it.each([
    [
      'Wants LBTC on Ethereum, should return the most recent LBTC address',
      [
        makeDepositAddress(
          DEPOSIT_ADDRESS_A,
          ChainId.ethereum,
          ACCOUNT_ADDRESS_A,
          toUnix(now() - DAY * 2),
          Token.LBTC,
        ),
        makeDepositAddress(
          DEPOSIT_ADDRESS_B,
          ChainId.ethereum,
          ACCOUNT_ADDRESS_A,
          toUnix(now() - DAY * 1),
          Token.LBTC,
        ),
      ],
      Token.LBTC,
      ChainId.ethereum,
      DEPOSIT_ADDRESS_B,
    ],

    [
      'Wants LBTC on Ethereum, no token information in the API response, should return the most recent LBTC address',
      [
        makeDepositAddress(
          DEPOSIT_ADDRESS_A,
          ChainId.ethereum,
          ACCOUNT_ADDRESS_A,
          toUnix(now() - DAY * 2),
        ),
        makeDepositAddress(
          DEPOSIT_ADDRESS_B,
          ChainId.ethereum,
          ACCOUNT_ADDRESS_A,
          toUnix(now() - DAY * 1),
        ),
      ],
      Token.LBTC,
      ChainId.ethereum,
      DEPOSIT_ADDRESS_B,
    ],

    [
      'Wants LBTC on Katana, only NativeLBTC address, should throw an error',
      [
        makeDepositAddress(
          DEPOSIT_ADDRESS_A,
          ChainId.katana,
          ACCOUNT_ADDRESS_A,
          toUnix(now() - DAY * 2),
          Token.BTCb,
        ),
      ],
      Token.LBTC,
      ChainId.katana,
      undefined,
    ],

    [
      'Wants NativeLBTC on Katana, should return the most recent NativeLBTC address',
      [
        makeDepositAddress(
          DEPOSIT_ADDRESS_A,
          ChainId.katana,
          ACCOUNT_ADDRESS_A,
          toUnix(now() - DAY * 1),
          Token.LBTC,
        ),
        makeDepositAddress(
          DEPOSIT_ADDRESS_B,
          ChainId.katana,
          ACCOUNT_ADDRESS_A,
          toUnix(now() - DAY * 2),
          Token.LBTC,
        ),
        makeDepositAddress(
          DEPOSIT_ADDRESS_C,
          ChainId.katana,
          ACCOUNT_ADDRESS_A,
          toUnix(now() - DAY * 2),
          Token.BTCb,
        ),
      ],
      Token.BTCb,
      ChainId.katana,
      DEPOSIT_ADDRESS_C,
    ],

    [
      'Wants BTCK (alias of NativeLBTC) on Katana, should return the most recent NativeLBTC address',
      [
        makeDepositAddress(
          DEPOSIT_ADDRESS_A,
          ChainId.katana,
          ACCOUNT_ADDRESS_A,
          toUnix(now() - DAY * 2),
          Token.BTCb,
        ),
        makeDepositAddress(
          DEPOSIT_ADDRESS_B,
          ChainId.katana,
          ACCOUNT_ADDRESS_A,
          toUnix(now() - DAY * 0),
          Token.LBTC,
        ),
      ],
      Token.BTCK,
      ChainId.katana,
      DEPOSIT_ADDRESS_A,
    ],

    [
      'Wants NativeLBTC on Katana, no token information in the API response, should throw an error',
      [
        makeDepositAddress(
          DEPOSIT_ADDRESS_A,
          ChainId.katana,
          ACCOUNT_ADDRESS_A,
          toUnix(now() - DAY * 2),
        ),
        makeDepositAddress(
          DEPOSIT_ADDRESS_B,
          ChainId.katana,
          ACCOUNT_ADDRESS_A,
          toUnix(now() - DAY * 0),
        ),
      ],
      Token.BTCK,
      ChainId.katana,
      undefined,
    ],

    [
      'Wants LBTC on Ethereum, should return the most recent LBTC address (legacy call)',
      [
        makeDepositAddress(
          DEPOSIT_ADDRESS_A,
          ChainId.ethereum,
          ACCOUNT_ADDRESS_A,
          toUnix(now() - DAY * 2),
        ),
        makeDepositAddress(
          DEPOSIT_ADDRESS_B,
          ChainId.katana,
          ACCOUNT_ADDRESS_A,
          toUnix(now() - DAY * 0),
        ),
        makeDepositAddress(
          DEPOSIT_ADDRESS_C,
          ChainId.base,
          ACCOUNT_ADDRESS_A,
          toUnix(now() - DAY * 0),
          Token.LBTC,
        ),
        makeDepositAddress(
          DEPOSIT_ADDRESS_C,
          ChainId.base,
          ACCOUNT_ADDRESS_A,
          toUnix(now() - DAY * 0),
          Token.BTCb,
        ),
      ],
      undefined,
      ChainId.ethereum,
      DEPOSIT_ADDRESS_A,
    ],

    [
      'Wants NativeLBTC on Ethereum, no token address for NativeLBTC on Ethereum, should throw an error.',
      [
        makeDepositAddress(
          DEPOSIT_ADDRESS_A,
          ChainId.ethereum,
          ACCOUNT_ADDRESS_A,
          toUnix(now() - DAY * 2),
        ),
      ],
      Token.BTCb,
      ChainId.ethereum,
      undefined,
    ],
  ])(
    '$0',
    async (
      _description: string,
      API_RESPONSE: IDepositAddress[],
      token: Token | undefined,
      chainId: ChainId,
      expectedAddress: string | undefined,
    ) => {
      const params: IGetDepositBtcAddressesParameters = {
        address: ACCOUNT_ADDRESS_A,
        chainId,
        env: Env.prod,
        partnerId: 'lombard',
      };

      (makeRequest as Mock).mockImplementation(async () => API_RESPONSE);

      if (!expectedAddress) {
        await expect(
          getDepositBtcAddress({ ...params, token }),
        ).rejects.toThrow();
      } else {
        const address = await getDepositBtcAddress({
          ...params,
          token,
        });

        expect(address).toBe(expectedAddress);
      }
    },
  );
});
