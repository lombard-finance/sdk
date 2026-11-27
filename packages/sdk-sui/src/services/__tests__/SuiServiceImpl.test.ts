import { beforeEach, describe, expect, it, vi } from 'vitest';

import { unstakeLBTC } from '../../web3Sdk/unstakeLBTC/unstakeLBTC';
import { SuiServiceImpl } from '../SuiServiceImpl';

vi.mock('../../web3Sdk/unstakeLBTC/unstakeLBTC', () => ({
  unstakeLBTC: vi.fn().mockResolvedValue({ digest: '0xdigest' }),
}));

const walletProvider = {
  getWallet: () => ({}),
  getWalletAccount: () => ({}),
};

const unstakeArgs = {
  amount: '1',
  btcAddress: 'bc1qexample',
  env: 'prod',
  chainId: 'sui:mainnet',
};

/** The client each unstakeLBTC call was handed. */
const clientsUsed = () =>
  vi.mocked(unstakeLBTC).mock.calls.map(([args]) => args.client);

describe('SuiServiceImpl', () => {
  // The module mock is shared, so calls from an earlier case would be read as
  // this one's.
  beforeEach(() => {
    vi.mocked(unstakeLBTC).mockClear();
  });

  it('reuses one client per network across calls', async () => {
    // The failover transport remembers the endpoint that last worked, and a
    // client per call would throw that away, paying a dead head endpoint's
    // timeout on every unstake.
    const service = new SuiServiceImpl(async () => walletProvider);

    await service.unstake(unstakeArgs);
    await service.unstake(unstakeArgs);

    const [first, second] = clientsUsed();
    expect(first).toBe(second);
  });

  it('keeps a separate client per network', async () => {
    const service = new SuiServiceImpl(async () => walletProvider);

    await service.unstake(unstakeArgs);
    await service.unstake({ ...unstakeArgs, chainId: 'sui:testnet' });

    const [mainnet, testnet] = clientsUsed();
    expect(mainnet).not.toBe(testnet);
  });
});
