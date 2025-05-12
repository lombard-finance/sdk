import { Connection } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INVALID_ADDRESS_ERROR } from '../../const/errors';
import { getBalance } from './getBalance';

// Mock @solana/web3.js
vi.mock('@solana/web3.js', async () => {
  const actual = await vi.importActual('@solana/web3.js');
  return {
    ...actual,
    Connection: vi.fn().mockImplementation(() => ({
      getBalance: vi.fn().mockResolvedValue(1000000000), // 1 SOL in lamports
      getTokenAccountsByOwner: vi.fn().mockResolvedValue({
        value: [
          {
            pubkey: 'token-account-pubkey',
          },
        ],
      }),
      getParsedAccountInfo: vi.fn().mockResolvedValue({
        value: {
          data: {
            parsed: {
              info: {
                amount: '1000000', // 1 token with 6 decimals
                decimals: 6,
              },
            },
          },
        },
      }),
    })),
    PublicKey: vi.fn().mockImplementation(key => {
      if (key === 'invalid-key') {
        throw new Error('Invalid public key');
      }
      return {
        toString: () => key,
      };
    }),
  };
});

describe('getBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should get SOL balance correctly', async () => {
    const result = await getBalance({
      publicKey: 'valid-public-key',
    });

    expect(result).toEqual({
      total: new BigNumber(1), // 1 SOL
      decimals: 9,
    });
  });

  it('should throw INVALID_ADDRESS_ERROR for invalid public key', async () => {
    await expect(
      getBalance({
        publicKey: 'invalid-key',
      }),
    ).rejects.toThrow(INVALID_ADDRESS_ERROR.message);
  });

  it('should return zero balance if no token accounts found', async () => {
    // Override the mock for this specific test
    const connectionMock: unknown = {
      getTokenAccountsByOwner: vi.fn().mockResolvedValue({
        value: [], // No token accounts
      }),
    };
    vi.mocked(Connection).mockImplementationOnce(
      () => connectionMock as Connection,
    );

    const result = await getBalance({
      publicKey: 'valid-public-key',
      tokenAddress: 'token-address',
    });

    expect(result).toEqual({
      total: new BigNumber(0),
      decimals: 0,
    });
  });
});
