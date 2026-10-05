import { Env } from '@lombard.finance/sdk-common';
import type { EIP1193Provider } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../common/chains';
import { getPermitNonce } from '../../../contract-functions/getPermitNonce/getPermitNonce';
import { signStakeAndBake } from '../../../contract-functions/signStakeAndBake/signStakeAndBake';
import { DefiProtocol } from '../../../defi/defi-registry';
import { LombardError } from '../../../shared/errors';
import { AddressKind, Token } from '../../../tokens/token-addresses';
import { getTokenContractInfo } from '../../../tokens/tokens';

const mocks = vi.hoisted(() => ({
  readContract: vi.fn(),
  signTypedData: vi.fn(),
  writeContract: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
}));

vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn(() => ({
    readContract: mocks.readContract,
    waitForTransactionReceipt: mocks.waitForTransactionReceipt,
  })),
}));

vi.mock('../../../clients/wallet-client', () => ({
  makeWalletClient: vi.fn(() => ({
    signTypedData: mocks.signTypedData,
    writeContract: mocks.writeContract,
  })),
}));

const LBTC_ADDRESS = '0x8236a87084f8B84306f72007F36F2618A5634494';
const BTCB_ADDRESS = '0xB0F70C0bD6FD87dbEb7C10dC692a2a6106817072';

vi.mock('../../../tokens/tokens', () => ({
  getTokenContractInfo: vi.fn(async (token: string, chainId: number) => {
    if (token === 'LBTC') return { address: LBTC_ADDRESS, abi: [], chainId };
    if (token === 'BTC.b') return { address: BTCB_ADDRESS, abi: [], chainId };
    throw new Error(`unexpected token ${token}`);
  }),
}));

vi.mock(
  '../../../api-functions/getLBTCExchangeRate/get-exchange-ratio',
  async () => {
    const { default: BigNumber } = await import('bignumber.js');
    return {
      getExchangeRatio: vi.fn(async () => ({
        LBTC: { BTCTokenRatio: new BigNumber('1.25') },
      })),
    };
  },
);

const ACCOUNT = '0x1234567890123456789012345678901234567890' as const;
const PROVIDER = {} as EIP1193Provider;
const expiry = () => Math.floor(Date.now() / 1000) + 3600;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.readContract.mockImplementation(
    async ({
      functionName,
      address,
    }: {
      functionName: string;
      address: string;
    }) => {
      if (functionName === 'nonces') return address === BTCB_ADDRESS ? 7n : 3n;
      if (functionName === 'allowance') return 0n;
      return 0n;
    },
  );
  mocks.signTypedData.mockResolvedValue('0xsig');
  mocks.writeContract.mockResolvedValue('0xapprove');
  mocks.waitForTransactionReceipt.mockResolvedValue({ status: 'success' });
});

type SignedTypedData = {
  domain: { name: string; version: string; verifyingContract: string };
  message: { spender: string; value: bigint; nonce: bigint; deadline: bigint };
};
const signed = (): SignedTypedData =>
  mocks.signTypedData.mock.calls[0][0] as SignedTypedData;

describe('getPermitNonce', () => {
  it('reads LBTC by default', async () => {
    const nonce = await getPermitNonce({
      owner: ACCOUNT,
      chainId: ChainId.ethereum,
      env: Env.prod,
    });

    expect(nonce).toBe('3');
    expect(vi.mocked(getTokenContractInfo)).toHaveBeenCalledWith(
      Token.LBTC,
      ChainId.ethereum,
      Env.prod,
      AddressKind.Token,
    );
    expect(mocks.readContract.mock.calls[0][0]).toMatchObject({
      address: LBTC_ADDRESS,
      functionName: 'nonces',
      args: [ACCOUNT],
    });
  });

  it('reads the requested token', async () => {
    const nonce = await getPermitNonce({
      owner: ACCOUNT,
      token: Token.BTCb,
      chainId: ChainId.ethereum,
      env: Env.prod,
    });

    expect(nonce).toBe('7');
    expect(mocks.readContract.mock.calls[0][0]).toMatchObject({
      address: BTCB_ADDRESS,
      functionName: 'nonces',
    });
  });
});

describe('signStakeAndBake on OnChainCredit', () => {
  it.each([Token.BTCb, 'BTC'] as const)(
    'signs %s over BTC.b with the BTC.b nonce and the amount as-is',
    async (token) => {
      const result = await signStakeAndBake({
        account: ACCOUNT,
        value: '150000',
        token,
        vaultKey: DefiProtocol.OnChainCredit,
        chainId: ChainId.ethereum,
        env: Env.prod,
        provider: PROVIDER,
        expiry: expiry(),
      });

      expect(result.mode).toBe('permit');
      const typedData = signed();
      expect(typedData.domain).toMatchObject({
        name: 'Bitcoin',
        version: '1',
        verifyingContract: BTCB_ADDRESS,
      });
      expect(typedData.message.spender).toBe(
        '0xCa12BFa58ee1a686aF2437bf1dc7460Df3A59a4d',
      );
      expect(typedData.message.value).toBe(150000n);
      expect(typedData.message.nonce).toBe(7n);

      const nonceReads = mocks.readContract.mock.calls.filter(
        ([call]) => call.functionName === 'nonces',
      );
      expect(nonceReads).toHaveLength(1);
      expect(nonceReads[0][0].address).toBe(BTCB_ADDRESS);
    },
  );

  it('keeps reading LBTC for the Veda BTC route', async () => {
    await signStakeAndBake({
      account: ACCOUNT,
      value: '125000',
      token: 'BTC',
      vaultKey: DefiProtocol.Veda,
      chainId: ChainId.ethereum,
      env: Env.prod,
      provider: PROVIDER,
      expiry: expiry(),
    });

    const typedData = signed();
    expect(typedData.domain.verifyingContract).toBe(LBTC_ADDRESS);
    expect(typedData.message.nonce).toBe(3n);
    // 125000 / 1.25
    expect(typedData.message.value).toBe(100000n);
  });
});

describe('signStakeAndBake nonce override', () => {
  it.each([
    [12n, 12n],
    [12, 12n],
    ['12', 12n],
    [0, 0n],
  ] as const)(
    'signs with nonce %s without reading the chain',
    async (nonce, expected) => {
      await signStakeAndBake({
        account: ACCOUNT,
        value: '1000',
        token: Token.BTCb,
        vaultKey: DefiProtocol.OnChainCredit,
        chainId: ChainId.ethereum,
        env: Env.prod,
        provider: PROVIDER,
        expiry: expiry(),
        nonce,
      });

      expect(signed().message.nonce).toBe(expected);
      expect(
        mocks.readContract.mock.calls.some(
          ([call]) => call.functionName === 'nonces',
        ),
      ).toBe(false);
    },
  );

  it('uses the override in approve mode', async () => {
    const result = await signStakeAndBake({
      account: ACCOUNT,
      value: '1000',
      token: Token.BTCb,
      vaultKey: DefiProtocol.Silo,
      chainId: ChainId.avalancheFuji,
      env: Env.testnet,
      provider: PROVIDER,
      nonce: 4,
    });

    expect(JSON.parse(result.typedData).message.nonce).toBe('4');
  });

  it.each([-1, 1.5, 'abc', '-2', ''])(
    'rejects nonce %s before signing',
    async (nonce) => {
      await expect(
        signStakeAndBake({
          account: ACCOUNT,
          value: '1000',
          token: Token.BTCb,
          vaultKey: DefiProtocol.OnChainCredit,
          chainId: ChainId.ethereum,
          env: Env.prod,
          provider: PROVIDER,
          expiry: expiry(),
          nonce,
        }),
      ).rejects.toBeInstanceOf(LombardError);
      expect(mocks.signTypedData).not.toHaveBeenCalled();
    },
  );
});

describe('signStakeAndBake approve-mode allowance', () => {
  const approve = (params: {
    allowance: bigint;
    pendingAllowance?: string;
  }) => {
    mocks.readContract.mockImplementation(
      async ({ functionName }: { functionName: string }) =>
        functionName === 'allowance' ? params.allowance : 0n,
    );
    return signStakeAndBake({
      account: ACCOUNT,
      value: '1000',
      token: Token.BTCb,
      vaultKey: DefiProtocol.Silo,
      chainId: ChainId.avalancheFuji,
      env: Env.testnet,
      provider: PROVIDER,
      ...(params.pendingAllowance !== undefined
        ? { pendingAllowance: params.pendingAllowance }
        : {}),
    });
  };

  it('approves only the value by default', async () => {
    await approve({ allowance: 0n });

    expect(mocks.writeContract.mock.calls[0][0].args[1]).toBe(1000n);
  });

  it('approves the pending sum plus the value', async () => {
    const result = await approve({ allowance: 0n, pendingAllowance: '2500' });

    expect(mocks.writeContract.mock.calls[0][0].args[1]).toBe(3500n);
    expect(result.approvalTxHash).toBe('0xapprove');
    // The typed data still carries only this deposit's value.
    expect(JSON.parse(result.typedData).message.value).toBe('1000');
  });

  it('skips the approval when the allowance covers the sum', async () => {
    const result = await approve({
      allowance: 3500n,
      pendingAllowance: '2500',
    });

    expect(mocks.writeContract).not.toHaveBeenCalled();
    expect(result.approvalTxHash).toBeUndefined();
  });

  it('approves when the allowance covers the value but not the sum', async () => {
    await approve({ allowance: 1000n, pendingAllowance: '2500' });

    expect(mocks.writeContract.mock.calls[0][0].args[1]).toBe(3500n);
  });

  it.each(['-1', '0.5', 'x'])('rejects pendingAllowance %s', async (value) => {
    await expect(
      approve({ allowance: 0n, pendingAllowance: value }),
    ).rejects.toBeInstanceOf(LombardError);
    expect(mocks.writeContract).not.toHaveBeenCalled();
  });
});
