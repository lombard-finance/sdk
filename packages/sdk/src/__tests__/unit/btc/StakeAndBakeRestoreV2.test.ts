/**
 * Restoring a stored stake-and-bake authorisation when the recipient may hold
 * permits for several stake-and-bake contracts on one chain.
 *
 * The v1 signature route answers with the most recent permit for the
 * recipient and chain whatever its spender, so a permit for another contract
 * could be read as this protocol's. With a wallet JWT the v2 permit route is
 * used and filtered to the strategy's spender and staked token; without one,
 * the v1 record is dropped when its nonce is already spent on the staked token.
 */

import { Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getExchangeRatio } from '../../../api-functions/getLBTCExchangeRate/get-exchange-ratio';
import { getUserStakeAndBakeSignature } from '../../../api-functions/getUserStakeAndBakeSignature';
import { getStakeAndBakePermits } from '../../../api-functions/stakeAndBakePermits/getStakeAndBakePermits';
import { stakeAndDeployConfig } from '../../../chains/btc/actions/stakeAndDeploy/config';
import { BtcActionStatus } from '../../../chains/btc/actions/stakeAndDeploy/types';
import { ChainId } from '../../../common/chains';
import { getPermitNonce } from '../../../contract-functions/getPermitNonce/getPermitNonce';
import { AssetId, Chain, type DeployProtocol } from '../../../core';
import type { BtcCoreContext } from '../../../shared/context';
import { Token } from '../../../tokens/token-addresses';
import { UnauthorizedWalletJwtError } from '../../../utils/err';

vi.mock('../../../api-functions/getUserStakeAndBakeSignature');
vi.mock('../../../api-functions/getLBTCExchangeRate/get-exchange-ratio');
vi.mock(
  '../../../api-functions/stakeAndBakePermits/getStakeAndBakePermits',
  () => ({ getStakeAndBakePermits: vi.fn() }),
);
vi.mock('../../../contract-functions/getPermitNonce/getPermitNonce', () => ({
  getPermitNonce: vi.fn(),
}));

const LBTC_ADDRESS = '0x8236a87084f8B84306f72007F36F2618A5634494';
const BTCB_ADDRESS = '0xB0F70C0bD6FD87dbEb7C10dC692a2a6106817072';
vi.mock('../../../tokens/tokens', () => ({
  getTokenContractInfo: vi.fn(async (token: string, chainId: number) => ({
    address: token === 'BTC.b' ? BTCB_ADDRESS : LBTC_ADDRESS,
    abi: [],
    chainId,
  })),
}));

const mockedV1 = vi.mocked(getUserStakeAndBakeSignature);
const mockedV2 = vi.mocked(getStakeAndBakePermits);
const mockedNonce = vi.mocked(getPermitNonce);

const RECIPIENT = '0x1111111111111111111111111111111111111111';
const VEDA_SPENDER = '0xC8bbF6153D7Ba105f1399D992ebd32B0541996ef';
const OCC_SPENDER = '0xCa12BFa58ee1a686aF2437bf1dc7460Df3A59a4d';

/** Ratio 1: the permit value equals the satoshis. */
const SATS = '100000';
const later = () => Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

const permit = (over: Partial<Record<string, unknown>> = {}) => ({
  spenderAddress: VEDA_SPENDER.toLowerCase(),
  tokenAddress: LBTC_ADDRESS.toLowerCase(),
  nonce: '4',
  depositAmount: SATS,
  expiresAt: later(),
  expired: false,
  blocked: false,
  ...over,
});
const occPermit = (over: Partial<Record<string, unknown>> = {}) =>
  permit({
    spenderAddress: OCC_SPENDER,
    tokenAddress: BTCB_ADDRESS,
    nonce: '0',
    ...over,
  });

function listed(...permits: ReturnType<typeof permit>[]) {
  mockedV2.mockResolvedValue({
    permits: permits as never,
    maxPermitsPerToken: 3,
  });
}

function v1OnFile(record: {
  nonce?: string;
  depositAmount?: string;
  expirationDate?: string;
  signature?: string;
}) {
  mockedV1.mockResolvedValue({
    userDestinationAddress: RECIPIENT,
    signature: record.signature ?? '0xstored',
    expirationDate: record.expirationDate ?? String(later()),
    depositAmount: record.depositAmount ?? SATS,
    chainId: String(ChainId.ethereum),
    ...(record.nonce !== undefined ? { nonce: record.nonce } : {}),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getExchangeRatio).mockResolvedValue({
    LBTC: {
      tokenBTCRatio: new BigNumber(1),
      BTCTokenRatio: new BigNumber(1),
    },
  });
  mockedV1.mockRejectedValue(new Error('no stored signature'));
});

const ctx = { env: Env.prod } as unknown as BtcCoreContext;
const restore = (required: {
  amount?: string;
  protocol?: string;
  walletJwt?: string;
}) =>
  stakeAndDeployConfig.restoreStakeAndBakeSignature(
    ctx,
    ChainId.ethereum,
    RECIPIENT,
    { amount: SATS, token: AssetId.BTC, ...required },
  );

describe('restoreStakeAndBakeSignature with a wallet JWT', () => {
  const withJwt = { protocol: 'veda', walletJwt: 'jwt' };

  it('reports the permit for the protocol spender and staked token', async () => {
    const expiresAt = later();
    listed(occPermit(), permit({ expiresAt }));

    await expect(restore(withJwt)).resolves.toEqual({
      hasSignature: true,
      signature: undefined,
      depositAmount: SATS,
      expirationDate: String(expiresAt),
      coversAmount: true,
    });
    expect(mockedV2).toHaveBeenCalledWith({
      address: RECIPIENT,
      chainId: ChainId.ethereum,
      walletJwt: 'jwt',
      env: Env.prod,
    });
  });

  it('ignores permits for another contract', async () => {
    listed(occPermit(), occPermit({ nonce: '1' }));

    await expect(restore(withJwt)).resolves.toBeNull();
  });

  it('ignores a permit for the right spender on another token', async () => {
    listed(permit({ tokenAddress: BTCB_ADDRESS }));

    await expect(restore(withJwt)).resolves.toBeNull();
  });

  it.each([
    ['expired', { expired: true }],
    ['blocked', { blocked: true }],
    ['past its deadline', { expiresAt: Math.floor(Date.now() / 1000) - 1 }],
  ])('ignores a %s permit', async (_label, over) => {
    listed(permit(over));

    await expect(restore(withJwt)).resolves.toBeNull();
  });

  it('prefers the lowest nonce that covers the deposit', async () => {
    listed(
      permit({ nonce: '9', depositAmount: SATS }),
      permit({ nonce: '2', depositAmount: '1' }),
      permit({ nonce: '5', depositAmount: SATS }),
    );

    await expect(restore(withJwt)).resolves.toMatchObject({
      coversAmount: true,
      depositAmount: SATS,
    });
    const result = await restore({ ...withJwt, amount: '50000000' });
    // None covers: the lowest nonce is reported.
    expect(result).toMatchObject({ coversAmount: false, depositAmount: '1' });
  });

  it('takes the signature bytes from v1 when it is the same permit', async () => {
    const expiresAt = later();
    listed(occPermit(), permit({ nonce: '4', expiresAt }));
    v1OnFile({
      nonce: '4',
      depositAmount: SATS,
      expirationDate: String(expiresAt),
      signature: '0xveda',
    });

    await expect(restore(withJwt)).resolves.toMatchObject({
      signature: '0xveda',
    });
  });

  it('does not take the bytes of another contract permit from v1', async () => {
    const expiresAt = later();
    listed(occPermit({ expiresAt }), permit({ nonce: '4' }));
    v1OnFile({
      nonce: '0',
      depositAmount: SATS,
      expirationDate: String(expiresAt),
      signature: '0xocc',
    });

    const result = await restore(withJwt);
    expect(result?.hasSignature).toBe(true);
    expect(result?.signature).toBeUndefined();
  });

  it('raises a rejected JWT', async () => {
    mockedV2.mockRejectedValue(
      new UnauthorizedWalletJwtError('v2/stake-and-bake/permits/unused'),
    );

    await expect(restore(withJwt)).rejects.toBeInstanceOf(
      UnauthorizedWalletJwtError,
    );
  });

  it('reads any other failure as nothing on file', async () => {
    mockedV2.mockRejectedValue(new Error('timeout'));

    await expect(restore(withJwt)).resolves.toBeNull();
  });

  it('restores an OnChainCredit permit for that protocol', async () => {
    listed(permit(), occPermit({ nonce: '3' }));

    await expect(
      restore({ protocol: 'onChainCredit', walletJwt: 'jwt' }),
    ).resolves.toMatchObject({ hasSignature: true, coversAmount: true });
  });
});

describe('restoreStakeAndBakeSignature without a wallet JWT', () => {
  it('drops a v1 record whose nonce is spent on the staked token', async () => {
    v1OnFile({ nonce: '0' });
    mockedNonce.mockResolvedValue('3');

    await expect(restore({ protocol: 'veda' })).resolves.toBeNull();
    expect(mockedNonce).toHaveBeenCalledWith(
      expect.objectContaining({ token: Token.LBTC, owner: RECIPIENT }),
    );
    expect(mockedV2).not.toHaveBeenCalled();
  });

  it('keeps a v1 record whose nonce is still pending', async () => {
    v1OnFile({ nonce: '3' });
    mockedNonce.mockResolvedValue('3');

    await expect(restore({ protocol: 'veda' })).resolves.toMatchObject({
      hasSignature: true,
      signature: '0xstored',
    });
  });

  it('keeps the record when the nonce read fails', async () => {
    v1OnFile({ nonce: '0' });
    mockedNonce.mockRejectedValue(new Error('rpc down'));

    await expect(restore({ protocol: 'veda' })).resolves.toMatchObject({
      hasSignature: true,
    });
  });

  it('keeps the record when it carries no nonce or no protocol is given', async () => {
    v1OnFile({});
    await expect(restore({ protocol: 'veda' })).resolves.toMatchObject({
      hasSignature: true,
    });

    v1OnFile({ nonce: '0' });
    await expect(restore({})).resolves.toMatchObject({ hasSignature: true });
    expect(mockedNonce).not.toHaveBeenCalled();
  });
});

describe('BtcStakeAndDeploy.prepare({ walletJwt })', () => {
  async function action() {
    const actionCtx = {
      env: Env.prod,
      capabilities: {
        require: (id: string) => {
          if (id === 'evm') {
            return { getStakeAndBakeFee: vi.fn().mockResolvedValue('0') };
          }
          throw new Error(`not stubbed: ${id}`);
        },
        has: () => true,
      },
      api: { getDepositAddress: vi.fn().mockResolvedValue(undefined) },
      partner: { getPartnerId: () => undefined },
    } as unknown as BtcCoreContext;

    const { BtcStakeAndDeploy } =
      await import('../../../chains/btc/actions/stakeAndDeploy/BtcStakeAndDeploy');

    return new BtcStakeAndDeploy(actionCtx, {
      assetOut: AssetId.LBTC,
      sourceChain: Chain.BITCOIN_MAINNET,
      destChain: Chain.ETHEREUM,
      protocol: 'veda' as DeployProtocol,
    });
  }

  it('is not blocked by a permit for another contract', async () => {
    // The v1 route's latest record is the other contract's permit, which
    // does not cover a larger deposit.
    v1OnFile({ nonce: '0', depositAmount: '1000' });
    mockedNonce.mockRejectedValue(new Error('rpc down'));
    listed(occPermit({ depositAmount: '1000' }));

    const withoutJwt = await action();
    await withoutJwt.prepare({ amount: '0.5', recipient: RECIPIENT });
    expect(withoutJwt.status).toBe(
      BtcActionStatus.BLOCKED_BY_EXISTING_AUTHORIZATION,
    );

    const withJwt = await action();
    await withJwt.prepare({
      amount: '0.5',
      recipient: RECIPIENT,
      walletJwt: 'jwt',
    });
    expect(withJwt.status).toBe(BtcActionStatus.NEEDS_DEPLOY_AUTHORIZATION);
    expect(withJwt.existingAuthorization).toBeUndefined();
  });

  it('goes ready on its own permit when v1 has the same permit bytes', async () => {
    const expiresAt = later();
    listed(occPermit(), permit({ nonce: '4', expiresAt }));
    v1OnFile({
      nonce: '4',
      depositAmount: SATS,
      expirationDate: String(expiresAt),
      signature: '0xveda',
    });

    const subject = await action();
    await subject.prepare({
      amount: '0.001',
      recipient: RECIPIENT,
      walletJwt: 'jwt',
    });

    expect(subject.status).toBe(BtcActionStatus.READY);
  });

  it('stops on its own permit when it does not cover the deposit', async () => {
    const expiresAt = later();
    listed(permit({ depositAmount: '1000', expiresAt }));

    const subject = await action();
    await subject.prepare({
      amount: '0.5',
      recipient: RECIPIENT,
      walletJwt: 'jwt',
    });

    expect(subject.status).toBe(
      BtcActionStatus.BLOCKED_BY_EXISTING_AUTHORIZATION,
    );
    expect(subject.existingAuthorization).toEqual({
      depositAmount: '1000',
      expiresAt: String(expiresAt),
    });
  });
});
