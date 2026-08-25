/**
 * Unit tests for BTC Stake fee-authorization recovery when the BFF reports
 * an active signature already exists for the user.
 *
 * Scenario: the user (or a prior tab) already triggered a fee auth flow.
 * When the SDK retries, `restoreFeeSignature` returns no signature so the
 * workflow proceeds to `authorize()`, but `storeFeeSignature` then rejects
 * with `FeeSignatureAlreadyExistsError` (code 6). The fix in evm.ts catches
 * that error, re-fetches the stored signature, and lets the workflow proceed
 * without surfacing a confusing failure to the user.
 */

import { Env } from '@lombard.finance/sdk-common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeeSignatureAlreadyExistsError } from '../../../api-functions/storeNetworkFeeSignature/storeNetworkFeeSignature';
import { evmConfig } from '../../../chains/btc/actions/deposit-lbtc/config/evm';
import { ChainId } from '../../../common/chains';
import { Chain } from '../../../core';
import type { BtcCoreContext } from '../../../shared/context';

const RECIPIENT = '0x000000000000000000000000000000000000aBcD';
const STORED_SIG = '0xstoredsig';
const STORED_TYPED = '{"stored":true}';
const LOCAL_SIG = '0xlocalsig';
const LOCAL_TYPED = '{"local":true}';

function buildCtx(overrides: Partial<BtcCoreContext> = {}): BtcCoreContext {
  const evm = {
    getMintingFee: vi.fn().mockResolvedValue('0.0000001'),
    signNetworkFee: vi
      .fn()
      .mockResolvedValue({ signature: LOCAL_SIG, typedData: LOCAL_TYPED }),
  };
  const api = {
    storeFeeSignature: vi.fn(),
    getFeeSignature: vi.fn(),
  };
  return {
    env: Env.prod,
    api,
    capabilities: {
      require: vi.fn().mockReturnValue(evm),
    },
    getProvider: vi.fn().mockResolvedValue({
      request: vi.fn().mockResolvedValue('0x1'),
    }),
    ...overrides,
  } as unknown as BtcCoreContext;
}

describe('BTC Stake fee-auth recovery (evm.authorizeFee)', () => {
  afterEach(() => vi.clearAllMocks());

  it('returns local sig + stores normally when no conflict', async () => {
    const ctx = buildCtx();
    (ctx.api.storeFeeSignature as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );

    const feeAuth = evmConfig.getFeeAuthConfig(Chain.ETHEREUM);
    expect(feeAuth).not.toBeNull();

    const result = await feeAuth!.authorizeFee(ctx, {
      chainId: ChainId.ethereum,
      recipient: RECIPIENT,
      fee: '0.0000001',
    });

    expect(result.signature).toBe(LOCAL_SIG);
    expect(ctx.api.storeFeeSignature).toHaveBeenCalledOnce();
    expect(ctx.api.getFeeSignature).not.toHaveBeenCalled();
  });

  it('recovers by re-fetching when storeFeeSignature throws FeeSignatureAlreadyExistsError', async () => {
    const ctx = buildCtx();
    (ctx.api.storeFeeSignature as ReturnType<typeof vi.fn>).mockRejectedValue(
      new FeeSignatureAlreadyExistsError(),
    );
    (ctx.api.getFeeSignature as ReturnType<typeof vi.fn>).mockResolvedValue({
      hasSignature: true,
      signature: STORED_SIG,
      typedData: STORED_TYPED,
    });

    const feeAuth = evmConfig.getFeeAuthConfig(Chain.ETHEREUM);
    const result = await feeAuth!.authorizeFee(ctx, {
      chainId: ChainId.ethereum,
      recipient: RECIPIENT,
      fee: '0.0000001',
    });

    expect(result.signature).toBe(STORED_SIG);
    expect(result.typedData).toBe(STORED_TYPED);
    expect(ctx.api.getFeeSignature).toHaveBeenCalledOnce();
  });

  it('falls back to local sig when BFF returns hasSignature=true but no signature', async () => {
    const ctx = buildCtx();
    (ctx.api.storeFeeSignature as ReturnType<typeof vi.fn>).mockRejectedValue(
      new FeeSignatureAlreadyExistsError(),
    );
    (ctx.api.getFeeSignature as ReturnType<typeof vi.fn>).mockResolvedValue({
      hasSignature: true,
      // signature field omitted: BFF acknowledges existence but doesn't return it
    });

    const feeAuth = evmConfig.getFeeAuthConfig(Chain.ETHEREUM);
    const result = await feeAuth!.authorizeFee(ctx, {
      chainId: ChainId.ethereum,
      recipient: RECIPIENT,
      fee: '0.0000001',
    });

    // Falls back to the local sig we just produced
    expect(result.signature).toBe(LOCAL_SIG);
  });

  it('throws a clearer error when BFF rejects store AND retrieve disagrees', async () => {
    const ctx = buildCtx();
    (ctx.api.storeFeeSignature as ReturnType<typeof vi.fn>).mockRejectedValue(
      new FeeSignatureAlreadyExistsError(),
    );
    (ctx.api.getFeeSignature as ReturnType<typeof vi.fn>).mockResolvedValue({
      hasSignature: false,
    });

    const feeAuth = evmConfig.getFeeAuthConfig(Chain.ETHEREUM);
    await expect(
      feeAuth!.authorizeFee(ctx, {
        chainId: ChainId.ethereum,
        recipient: RECIPIENT,
        fee: '0.0000001',
      }),
    ).rejects.toThrow(/cannot be retrieved/i);
  });

  it('rethrows non-recovery errors unchanged', async () => {
    const ctx = buildCtx();
    const boom = new Error('Network timeout');
    (ctx.api.storeFeeSignature as ReturnType<typeof vi.fn>).mockRejectedValue(
      boom,
    );

    const feeAuth = evmConfig.getFeeAuthConfig(Chain.ETHEREUM);
    await expect(
      feeAuth!.authorizeFee(ctx, {
        chainId: ChainId.ethereum,
        recipient: RECIPIENT,
        fee: '0.0000001',
      }),
    ).rejects.toThrow('Network timeout');
    expect(ctx.api.getFeeSignature).not.toHaveBeenCalled();
  });
});
