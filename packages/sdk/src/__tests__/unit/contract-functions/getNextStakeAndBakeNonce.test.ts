import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getStakeAndBakePermits } from '../../../api-functions/stakeAndBakePermits/getStakeAndBakePermits';
import { ChainId } from '../../../common/chains';
import { getNextStakeAndBakeNonce } from '../../../contract-functions/getNextStakeAndBakeNonce/getNextStakeAndBakeNonce';
import { getPermitNonce } from '../../../contract-functions/getPermitNonce/getPermitNonce';
import { DefiProtocol } from '../../../defi/defi-registry';
import { Token } from '../../../tokens/token-addresses';

const BTCB_ADDRESS = '0xB0F70C0bD6FD87dbEb7C10dC692a2a6106817072';
const LBTC_ADDRESS = '0x8236a87084f8B84306f72007F36F2618A5634494';

vi.mock('../../../tokens/tokens', () => ({
  getTokenContractInfo: vi.fn(async (token: string, chainId: number) => ({
    address: token === 'BTC.b' ? BTCB_ADDRESS : LBTC_ADDRESS,
    abi: [],
    chainId,
  })),
}));

vi.mock('../../../contract-functions/getPermitNonce/getPermitNonce', () => ({
  getPermitNonce: vi.fn(),
}));

vi.mock(
  '../../../api-functions/stakeAndBakePermits/getStakeAndBakePermits',
  () => ({ getStakeAndBakePermits: vi.fn() }),
);

const OWNER = '0x1234567890123456789012345678901234567890' as const;

const permit = (tokenAddress: string, nonce: string) => ({
  spenderAddress: '0xspender',
  tokenAddress,
  nonce,
  depositAmount: '1000',
  expiresAt: 0,
  expired: false,
  blocked: false,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPermitNonce).mockResolvedValue('5');
});

describe('getNextStakeAndBakeNonce', () => {
  it('permit mode: on-chain nonce plus the pending permits on the staked token', async () => {
    vi.mocked(getStakeAndBakePermits).mockResolvedValue({
      permits: [
        permit(BTCB_ADDRESS.toLowerCase(), '5'),
        permit(BTCB_ADDRESS, '6'),
        // Another token's sequence does not count.
        permit(LBTC_ADDRESS, '9'),
      ],
      maxPermitsPerToken: 3,
    });

    const nonce = await getNextStakeAndBakeNonce({
      owner: OWNER,
      protocol: DefiProtocol.OnChainCredit,
      token: 'BTC',
      chainId: ChainId.ethereum,
      env: Env.prod,
      walletJwt: 'jwt',
      rpcUrl: 'https://rpc.example',
    });

    expect(nonce).toBe(7n);
    expect(getPermitNonce).toHaveBeenCalledWith({
      owner: OWNER,
      token: Token.BTCb,
      chainId: ChainId.ethereum,
      rpcUrl: 'https://rpc.example',
      env: Env.prod,
    });
    expect(getStakeAndBakePermits).toHaveBeenCalledWith({
      address: OWNER,
      chainId: ChainId.ethereum,
      walletJwt: 'jwt',
      env: Env.prod,
    });
  });

  it('permit mode: the on-chain nonce when nothing is pending', async () => {
    vi.mocked(getStakeAndBakePermits).mockResolvedValue({
      permits: [],
      maxPermitsPerToken: 3,
    });

    const nonce = await getNextStakeAndBakeNonce({
      owner: OWNER,
      protocol: DefiProtocol.Veda,
      token: 'BTC',
      chainId: ChainId.ethereum,
      env: Env.prod,
      walletJwt: 'jwt',
    });

    expect(nonce).toBe(5n);
    expect(vi.mocked(getPermitNonce).mock.calls[0][0].token).toBe(Token.LBTC);
  });

  it('approve mode: one above the highest pending nonce on the token', async () => {
    vi.mocked(getStakeAndBakePermits).mockResolvedValue({
      permits: [
        permit(BTCB_ADDRESS, '2'),
        permit(BTCB_ADDRESS, '10'),
        permit(LBTC_ADDRESS, '40'),
      ],
      maxPermitsPerToken: 3,
    });

    const nonce = await getNextStakeAndBakeNonce({
      owner: OWNER,
      protocol: DefiProtocol.Silo,
      token: Token.BTCb,
      chainId: ChainId.avalancheFuji,
      env: Env.testnet,
      walletJwt: 'jwt',
    });

    expect(nonce).toBe(11n);
    expect(getPermitNonce).not.toHaveBeenCalled();
  });

  it('approve mode: 0 when nothing is pending', async () => {
    vi.mocked(getStakeAndBakePermits).mockResolvedValue({
      permits: [],
      maxPermitsPerToken: 3,
    });

    const nonce = await getNextStakeAndBakeNonce({
      owner: OWNER,
      protocol: DefiProtocol.Silo,
      token: Token.BTCb,
      chainId: ChainId.avalancheFuji,
      env: Env.testnet,
      walletJwt: 'jwt',
    });

    expect(nonce).toBe(0n);
  });

  it('refuses a route the registry does not carry', async () => {
    await expect(
      getNextStakeAndBakeNonce({
        owner: OWNER,
        protocol: DefiProtocol.OnChainCredit,
        token: 'BTC',
        chainId: ChainId.sepolia,
        env: Env.stage,
        walletJwt: 'jwt',
      }),
    ).rejects.toThrow(/not supported/);
    expect(getStakeAndBakePermits).not.toHaveBeenCalled();
  });
});
