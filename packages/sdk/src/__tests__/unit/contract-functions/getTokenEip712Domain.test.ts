import { Env } from '@lombard.finance/sdk-common';
import {
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
} from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makePublicClient } from '../../../clients/public-client';
import { ChainId } from '../../../common/chains';

const { readContract } = vi.hoisted(() => ({ readContract: vi.fn() }));
vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn(() => ({ readContract })),
}));

const address = '0x8236a87084f8b84306f72007f36f2618a5634494';
const salt = `0x${'00'.repeat(32)}`;
const parameters = {
  chainId: ChainId.ethereum,
  tokenAddress: address,
  rpcUrl: 'https://rpc.example.com',
  env: Env.prod,
} as const;
const domainResult = () => ['0x0f', 'Lombard BTC', '2', 1n, address, salt, []];

async function reader() {
  return (
    await import('../../../contract-functions/getTokenEip712Domain/getTokenEip712Domain')
  ).getTokenEip712Domain;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  readContract.mockReset().mockResolvedValue(domainResult());
});

describe('getTokenEip712Domain', () => {
  it('reads all four fields, including the renamed name and contract version', async () => {
    const getDomain = await reader();
    expect(await getDomain(parameters)).toEqual({
      name: 'Lombard BTC',
      version: '2',
      chainId: 1,
      verifyingContract: address,
    });
    expect(makePublicClient).toHaveBeenCalledWith({
      chainId: 1,
      rpcUrl: parameters.rpcUrl,
      env: Env.prod,
    });
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address,
        functionName: 'eip712Domain',
      }),
    );
  });

  it.each([
    new ContractFunctionRevertedError({
      abi: [],
      functionName: 'eip712Domain',
    }),
    new ContractFunctionZeroDataError({ functionName: 'eip712Domain' }),
  ])(
    'falls back to name() when the getter is unavailable: %s',
    async (error) => {
      readContract
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('Lombard BTC');
      const getDomain = await reader();
      expect(await getDomain(parameters)).toEqual({
        name: 'Lombard BTC',
        version: '1',
        chainId: 1,
        verifyingContract: address,
      });
      expect(readContract).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          address,
          functionName: 'name',
        }),
      );
    },
  );

  it('shares in-flight reads only for the same case-insensitive address and chain', async () => {
    const getDomain = await reader();
    const otherAddress = '0xB0F70C0bD6FD87dbEb7C10dC692a2a6106817072';
    readContract
      .mockResolvedValueOnce(domainResult())
      .mockResolvedValueOnce([
        '0x0f',
        'Other chain',
        '1',
        8453n,
        address,
        salt,
        [],
      ])
      .mockResolvedValueOnce([
        '0x0f',
        'Bitcoin',
        '1',
        1n,
        otherAddress,
        salt,
        [],
      ]);
    const [first, second, otherChain, otherToken] = await Promise.all([
      getDomain(parameters),
      getDomain({
        ...parameters,
        tokenAddress: `0x${address.slice(2).toUpperCase()}`,
      }),
      getDomain({ ...parameters, chainId: ChainId.base }),
      getDomain({ ...parameters, tokenAddress: otherAddress }),
    ]);
    expect(first).toEqual(second);
    expect(otherChain.name).toBe('Other chain');
    expect(otherToken.name).toBe('Bitcoin');
    expect(readContract).toHaveBeenCalledTimes(3);
    first.name = 'modified';
    expect(second.name).toBe('Lombard BTC');
  });

  it('reads again after settlement and sees a renamed token without reloading', async () => {
    readContract
      .mockResolvedValueOnce([
        '0x0f',
        'Lombard Staked Bitcoin',
        '1',
        1n,
        address,
        salt,
        [],
      ])
      .mockResolvedValueOnce([
        '0x0f',
        'Lombard BTC',
        '1',
        1n,
        address,
        salt,
        [],
      ]);
    const getDomain = await reader();
    expect((await getDomain(parameters)).name).toBe('Lombard Staked Bitcoin');
    expect((await getDomain(parameters)).name).toBe('Lombard BTC');
    expect(readContract).toHaveBeenCalledTimes(2);
  });

  it('propagates RPC failures without fallback and retries the next call', async () => {
    readContract.mockRejectedValueOnce(new Error('RPC unavailable'));
    const getDomain = await reader();
    await expect(getDomain(parameters)).rejects.toThrow('RPC unavailable');
    expect(readContract).toHaveBeenCalledTimes(1);
    expect((await getDomain(parameters)).name).toBe('Lombard BTC');
    expect(readContract).toHaveBeenCalledTimes(2);
  });

  it('does not cache a failed name() fallback', async () => {
    readContract
      .mockRejectedValueOnce(
        new ContractFunctionZeroDataError({ functionName: 'eip712Domain' }),
      )
      .mockRejectedValueOnce(new Error('name failed'));
    const getDomain = await reader();
    await expect(getDomain(parameters)).rejects.toThrow('name failed');
    expect((await getDomain(parameters)).name).toBe('Lombard BTC');
    expect(readContract).toHaveBeenCalledTimes(3);
  });

  it.each([
    ['fields', ['0x0b', 'Lombard BTC', '1', 1n, address, salt, []]],
    ['salt', ['0x1f', 'Lombard BTC', '1', 1n, address, salt, []]],
    ['extensions', ['0x0f', 'Lombard BTC', '1', 1n, address, salt, [1n]]],
    ['chain', ['0x0f', 'Lombard BTC', '1', 8453n, address, salt, []]],
    [
      'token',
      [
        '0x0f',
        'Lombard BTC',
        '1',
        1n,
        '0x1111111111111111111111111111111111111111',
        salt,
        [],
      ],
    ],
  ])(
    'rejects unsupported or mismatched %s without fallback',
    async (_, result) => {
      readContract.mockResolvedValueOnce(result);
      const getDomain = await reader();
      await expect(getDomain(parameters)).rejects.toThrow(/EIP-712 domain/);
      expect(readContract).toHaveBeenCalledTimes(1);
    },
  );
});
