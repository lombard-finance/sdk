import { Env } from '@lombard.finance/sdk-common';
import type { EIP1193Provider } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../common/chains';
import { getTokenEip712Domain } from '../../../contract-functions/getTokenEip712Domain/getTokenEip712Domain';
import { getTypedData } from '../../../contract-functions/signNetworkFee/getTypedData';
import { signNetworkFee } from '../../../contract-functions/signNetworkFee/signNetworkFee';
import { signStakeAndBake } from '../../../contract-functions/signStakeAndBake/signStakeAndBake';
import { DefiProtocol } from '../../../defi/defi-registry';
import { Token } from '../../../tokens/token-addresses';

const { signTypedData, writeContract } = vi.hoisted(() => ({
  signTypedData: vi.fn().mockResolvedValue('0x1234'),
  writeContract: vi.fn(),
}));
vi.mock('../../../clients/wallet-client', () => ({
  makeWalletClient: vi.fn(() => ({ signTypedData, writeContract })),
}));
vi.mock('../../../tokens/tokens', () => ({
  getTokenContractInfo: vi.fn(async () => ({
    address: '0x8236a87084f8b84306f72007f36f2618a5634494',
    abi: [],
  })),
}));
vi.mock(
  '../../../contract-functions/getTokenEip712Domain/getTokenEip712Domain',
  () => ({
    getTokenEip712Domain: vi.fn(),
  }),
);
vi.mock('../../../contract-functions/getPermitNonce/getPermitNonce', () => ({
  getPermitNonce: vi.fn(async () => 5n),
}));
const domain = {
  name: 'Lombard BTC',
  version: '2',
  chainId: 1,
  verifyingContract: '0x8236a87084f8b84306f72007f36f2618a5634494',
} as const;
const parameters = {
  chainId: ChainId.ethereum,
  account: '0x1111111111111111111111111111111111111111',
  provider: {} as EIP1193Provider,
  rpcUrl: 'https://rpc.example.com',
  env: Env.prod,
  expiry: Math.floor(Date.now() / 1000) + 86400,
} as const;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getTokenEip712Domain).mockResolvedValue(domain);
});

describe('on-chain signing domains', () => {
  it.each([Token.LBTC, Token.BTCb])(
    'uses the returned domain for %s fees',
    async (token) => {
      const result = await signNetworkFee({
        ...parameters,
        token,
        fee: '1100',
      });
      expect(signTypedData).toHaveBeenCalledWith(
        expect.objectContaining({ domain }),
      );
      expect(JSON.parse(result.typedData)).toMatchObject({
        domain,
        message: { chainId: 1, fee: '1100', expiry: parameters.expiry },
      });
      expect(getTokenEip712Domain).toHaveBeenCalledWith({
        chainId: 1,
        tokenAddress: domain.verifyingContract,
        rpcUrl: parameters.rpcUrl,
        env: Env.prod,
      });
    },
  );

  it('uses the returned domain instead of the registry name for permits', async () => {
    const result = await signStakeAndBake({
      ...parameters,
      token: Token.LBTC,
      vaultKey: DefiProtocol.Veda,
      value: '100000',
    });
    expect(signTypedData).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: { ...domain, chainId: 1n },
      }),
    );
    expect(JSON.parse(result.typedData).domain).toEqual({
      ...domain,
      chainId: '1',
    });
    expect(getTokenEip712Domain).toHaveBeenCalledWith({
      chainId: 1,
      tokenAddress: domain.verifyingContract,
      rpcUrl: parameters.rpcUrl,
      env: Env.prod,
    });
    expect(writeContract).not.toHaveBeenCalled();
  });

  it('accepts an on-chain domain in the synchronous fee builder', () => {
    expect(
      getTypedData({
        chainId: 1,
        verifyingContract: domain.verifyingContract,
        fee: '1100',
        expiry: parameters.expiry,
        domain,
      }).domain,
    ).toEqual(domain);
  });

  it('does not sign when the domain lookup fails', async () => {
    vi.mocked(getTokenEip712Domain).mockRejectedValue(
      new Error('RPC unavailable'),
    );
    await expect(
      signNetworkFee({ ...parameters, fee: '1100' }),
    ).rejects.toThrow('RPC unavailable');
    await expect(
      signStakeAndBake({ ...parameters, token: Token.LBTC, value: '100000' }),
    ).rejects.toThrow('RPC unavailable');
    expect(signTypedData).not.toHaveBeenCalled();
    expect(writeContract).not.toHaveBeenCalled();
  });
});
