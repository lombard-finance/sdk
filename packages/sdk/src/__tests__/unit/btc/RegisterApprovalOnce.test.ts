/**
 * Unit tests for who stores a freshly signed approval.
 *
 * The signature an action signs is also sent to `generateDepositAddress`, and
 * the server stores it there. When both do it, the second write is a write of a
 * signature the server already holds, which it cannot tell apart from the same
 * signature being presented twice. Each action therefore stores it only when it
 * is not about to hand it to address generation, which is exactly when a
 * deposit address already exists.
 */

import { Env } from '@lombard.finance/sdk-common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BtcDeposit } from '../../../chains/btc/actions/deposit/BtcDeposit';
import { evmDepositConfig } from '../../../chains/btc/actions/deposit/config/evm';
import { evmDepositAndDeployConfig } from '../../../chains/btc/actions/depositAndDeploy/config/evm';
import { evmConfig } from '../../../chains/btc/actions/stake/config/evm';
import { evmStakeAndDeployConfig } from '../../../chains/btc/actions/stakeAndDeploy/config/evm';
import { PartnerConfiguration } from '../../../client/PartnerConfiguration';
import { ChainId } from '../../../common/chains';
import { AssetId, Chain } from '../../../core';
import type { BtcCoreContext } from '../../../shared/context';

const RECIPIENT = '0x000000000000000000000000000000000000aBcD';
const SIGNATURE = '0xfresh';
const TYPED_DATA = '{"fresh":true}';

function buildCtx(): BtcCoreContext {
  const evm = {
    getMintingFee: vi.fn().mockResolvedValue('0.0000001'),
    getStakeAndBakeFee: vi.fn().mockResolvedValue('0.0000001'),
    signNetworkFee: vi
      .fn()
      .mockResolvedValue({ signature: SIGNATURE, typedData: TYPED_DATA }),
    signStakeAndBake: vi
      .fn()
      .mockResolvedValue({ signature: SIGNATURE, typedData: TYPED_DATA }),
  };

  return {
    env: Env.prod,
    api: {
      storeFeeSignature: vi.fn().mockResolvedValue(undefined),
      getFeeSignature: vi.fn(),
      storeStakeAndBakeSignature: vi.fn().mockResolvedValue(undefined),
    },
    partner: new PartnerConfiguration({ partnerId: 'test-partner' }),
    capabilities: {
      require: vi.fn().mockReturnValue(evm),
    },
    getProvider: vi.fn().mockResolvedValue({
      request: vi.fn().mockResolvedValue('0x1'),
    }),
  } as unknown as BtcCoreContext;
}

const feeAuthParams = {
  chainId: ChainId.ethereum,
  recipient: RECIPIENT,
  fee: '0.0000001',
};

const stakeAndBakeParams = {
  chainId: ChainId.avalanche,
  recipient: RECIPIENT,
  amount: '10000',
  vaultKey: 'silo',
  token: 'BTCb',
};

describe('an approval is stored once', () => {
  afterEach(() => vi.clearAllMocks());

  describe('BTC stake fee authorization', () => {
    it('stores the signature when no address generation will carry it', async () => {
      const ctx = buildCtx();
      const feeAuth = evmConfig.getFeeAuthConfig(Chain.ETHEREUM);

      const result = await feeAuth!.authorizeFee(ctx, {
        ...feeAuthParams,
        storeSignature: true,
      });

      expect(ctx.api.storeFeeSignature).toHaveBeenCalledOnce();
      expect(result.signature).toBe(SIGNATURE);
    });

    it('leaves the signature to address generation when asked to', async () => {
      const ctx = buildCtx();
      const feeAuth = evmConfig.getFeeAuthConfig(Chain.ETHEREUM);

      const result = await feeAuth!.authorizeFee(ctx, {
        ...feeAuthParams,
        storeSignature: false,
      });

      expect(ctx.api.storeFeeSignature).not.toHaveBeenCalled();
      expect(result).toEqual({ signature: SIGNATURE, typedData: TYPED_DATA });
    });

    it('stores by default', async () => {
      const ctx = buildCtx();
      const feeAuth = evmConfig.getFeeAuthConfig(Chain.ETHEREUM);

      await feeAuth!.authorizeFee(ctx, feeAuthParams);

      expect(ctx.api.storeFeeSignature).toHaveBeenCalledOnce();
    });
  });

  describe('BTC deposit fee authorization', () => {
    it('leaves the signature to address generation when asked to', async () => {
      const ctx = buildCtx();
      const feeAuth = evmDepositConfig.getFeeAuthConfig(Chain.ETHEREUM);

      const result = await feeAuth!.authorizeFee(ctx, {
        ...feeAuthParams,
        storeSignature: false,
      });

      expect(ctx.api.storeFeeSignature).not.toHaveBeenCalled();
      expect(result).toEqual({ signature: SIGNATURE, typedData: TYPED_DATA });
    });

    it('stores by default', async () => {
      const ctx = buildCtx();
      const feeAuth = evmDepositConfig.getFeeAuthConfig(Chain.ETHEREUM);

      await feeAuth!.authorizeFee(ctx, feeAuthParams);

      expect(ctx.api.storeFeeSignature).toHaveBeenCalledOnce();
    });
  });

  describe('deposit and deploy authorization', () => {
    it('leaves the signature to address generation when asked to', async () => {
      const ctx = buildCtx();

      const result = await evmDepositAndDeployConfig.authorizeDepositAndDeploy(
        ctx,
        { ...stakeAndBakeParams, storeSignature: false },
      );

      expect(ctx.api.storeStakeAndBakeSignature).not.toHaveBeenCalled();
      expect(result.signature).toBe(SIGNATURE);
      expect(result.typedData).toBe(TYPED_DATA);
    });

    it('stores by default, which is what the resume path relies on', async () => {
      const ctx = buildCtx();

      await evmDepositAndDeployConfig.authorizeDepositAndDeploy(
        ctx,
        stakeAndBakeParams,
      );

      expect(ctx.api.storeStakeAndBakeSignature).toHaveBeenCalledOnce();
    });
  });

  describe('stake and deploy authorization', () => {
    it('leaves the signature to address generation when asked to', async () => {
      const ctx = buildCtx();

      const result = await evmStakeAndDeployConfig.authorizeStakeAndBake(ctx, {
        ...stakeAndBakeParams,
        storeSignature: false,
      });

      expect(ctx.api.storeStakeAndBakeSignature).not.toHaveBeenCalled();
      expect(result.signature).toBe(SIGNATURE);
      expect(result.typedData).toBe(TYPED_DATA);
    });

    it('stores by default, which is what the resume path relies on', async () => {
      const ctx = buildCtx();

      await evmStakeAndDeployConfig.authorizeStakeAndBake(
        ctx,
        stakeAndBakeParams,
      );

      expect(ctx.api.storeStakeAndBakeSignature).toHaveBeenCalledOnce();
    });
  });
});

describe('BtcDeposit decides from the address it holds', () => {
  afterEach(() => vi.clearAllMocks());

  function buildDepositCtx(existingAddress: string | null): BtcCoreContext {
    const ctx = buildCtx();

    (ctx.api as unknown as Record<string, unknown>).getDepositAddress = vi
      .fn()
      .mockResolvedValue(existingAddress);
    (ctx.api as unknown as Record<string, unknown>).getFeeSignature = vi
      .fn()
      .mockResolvedValue({ hasSignature: false });
    (ctx.api as unknown as Record<string, unknown>).generateDepositAddress = vi
      .fn()
      .mockResolvedValue('tb1qgenerated');

    return ctx;
  }

  it('stores the signature itself when the address already exists', async () => {
    const ctx = buildDepositCtx('tb1qexisting');
    const deposit = new BtcDeposit(ctx, {
      assetOut: AssetId.BTCb,
      destChain: Chain.ETHEREUM,
    });

    await deposit.prepare({ amount: '0.01', recipient: RECIPIENT });
    await deposit.authorizeFee();

    expect(ctx.api.storeFeeSignature).toHaveBeenCalledOnce();
  });

  it('leaves it to address generation when there is no address yet', async () => {
    const ctx = buildDepositCtx(null);
    const deposit = new BtcDeposit(ctx, {
      assetOut: AssetId.BTCb,
      destChain: Chain.ETHEREUM,
    });

    await deposit.prepare({ amount: '0.01', recipient: RECIPIENT });
    await deposit.authorizeFee();

    expect(ctx.api.storeFeeSignature).not.toHaveBeenCalled();

    await deposit.generateDepositAddress();

    expect(ctx.api.generateDepositAddress).toHaveBeenCalledOnce();
  });
});
