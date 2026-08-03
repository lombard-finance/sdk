/**
 * Stake and Bake Signature Expiry Tests
 *
 * The EIP-712 stake-and-bake signature expires 24 hours after signing by
 * default. `signStakeAndBake` has always accepted an `expiry` override, but the
 * value was not reachable from the BTC action layer.
 *
 * These tests pin the override to every layer it has to travel through:
 *   BtcStakeAndDeploy.authorizeDeposit({ expiry })
 *     -> stakeAndDeployConfig.authorizeStakeAndBake({ expiry })
 *       -> EvmService.signStakeAndBake({ expiry })
 *
 * `expiry` is an absolute UNIX timestamp in seconds, matching the low-level
 * `signStakeAndBake` parameter it forwards to. When omitted, each layer must
 * pass `undefined` through so the 24h default parameter still applies.
 *
 * @module __tests__/unit/btc/StakeAndBakeExpiry.test.ts
 */

import { Env } from '@lombard.finance/sdk-common';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from 'vitest';

import { BtcDepositAndDeploy } from '../../../chains/btc/actions/depositAndDeploy/BtcDepositAndDeploy';
import { depositAndDeployConfig } from '../../../chains/btc/actions/depositAndDeploy/config';
import { BtcStakeAndDeploy } from '../../../chains/btc/actions/stakeAndDeploy/BtcStakeAndDeploy';
import { stakeAndDeployConfig } from '../../../chains/btc/actions/stakeAndDeploy/config';
import { PartnerConfiguration } from '../../../client/PartnerConfiguration';
import { ChainId } from '../../../common/chains';
import { AssetId, Chain, DeployProtocol } from '../../../core';
import type { BtcCoreContext } from '../../../shared/context';

const RECIPIENT = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
const AMOUNT = '0.1';

/** A fixed absolute UNIX timestamp (seconds), well past the 24h default. */
const CUSTOM_EXPIRY = 1893456000;

function buildCtx(chainId: ChainId): BtcCoreContext {
  const evm = {
    getStakeAndBakeFee: vi.fn().mockResolvedValue('0.0000001'),
    signStakeAndBake: vi.fn().mockResolvedValue({
      signature: '0xsig',
      typedData: '{"typed":true}',
    }),
  };

  return {
    env: Env.testnet,
    btc: {} as BtcCoreContext['btc'],
    api: {
      getDepositAddress: vi.fn().mockResolvedValue(null),
      storeStakeAndBakeSignature: vi.fn().mockResolvedValue(undefined),
    },
    partner: new PartnerConfiguration({ partnerId: 'test-partner' }),
    capabilities: {
      require: vi.fn().mockReturnValue(evm),
    },
    getProvider: vi.fn().mockResolvedValue({
      // Report the target chain so ensureCorrectChain is a no-op
      request: vi.fn().mockResolvedValue(`0x${chainId.toString(16)}`),
    }),
  } as unknown as BtcCoreContext;
}

/** The `evm` service mock handed out by `ctx.capabilities.require('evm')`. */
function evmOf(ctx: BtcCoreContext) {
  return (ctx.capabilities.require as ReturnType<typeof vi.fn>)('evm') as {
    signStakeAndBake: ReturnType<typeof vi.fn>;
  };
}

describe('Stake and bake signature expiry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Config layer: stakeAndDeploy (BTC -> LBTC -> Veda)
  // ═══════════════════════════════════════════════════════════════════════

  describe('stakeAndDeployConfig.authorizeStakeAndBake', () => {
    it('forwards a caller-supplied expiry to signStakeAndBake', async () => {
      const ctx = buildCtx(ChainId.sepolia);

      await stakeAndDeployConfig.authorizeStakeAndBake(ctx, {
        chainId: ChainId.sepolia,
        recipient: RECIPIENT,
        amount: '10000000',
        vaultKey: DeployProtocol.Veda,
        token: AssetId.BTC,
        expiry: CUSTOM_EXPIRY,
      });

      expect(evmOf(ctx).signStakeAndBake).toHaveBeenCalledWith(
        expect.objectContaining({ expiry: CUSTOM_EXPIRY }),
      );
    });

    it('passes expiry through as undefined when the caller omits it', async () => {
      const ctx = buildCtx(ChainId.sepolia);

      await stakeAndDeployConfig.authorizeStakeAndBake(ctx, {
        chainId: ChainId.sepolia,
        recipient: RECIPIENT,
        amount: '10000000',
        vaultKey: DeployProtocol.Veda,
        token: AssetId.BTC,
      });

      // undefined lets signStakeAndBake's own 24h default parameter apply
      const [params] = evmOf(ctx).signStakeAndBake.mock.calls[0];
      expect(params.expiry).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Config layer: depositAndDeploy (BTC -> BTC.b -> Silo)
  // ═══════════════════════════════════════════════════════════════════════

  describe('depositAndDeployConfig.authorizeDepositAndDeploy', () => {
    it('forwards a caller-supplied expiry to signStakeAndBake', async () => {
      const ctx = buildCtx(ChainId.avalancheFuji);

      await depositAndDeployConfig.authorizeDepositAndDeploy(ctx, {
        chainId: ChainId.avalancheFuji,
        recipient: RECIPIENT,
        amount: '10000000',
        vaultKey: DeployProtocol.Silo,
        token: AssetId.BTCb,
        expiry: CUSTOM_EXPIRY,
      });

      expect(evmOf(ctx).signStakeAndBake).toHaveBeenCalledWith(
        expect.objectContaining({ expiry: CUSTOM_EXPIRY }),
      );
    });

    it('passes expiry through as undefined when the caller omits it', async () => {
      const ctx = buildCtx(ChainId.avalancheFuji);

      await depositAndDeployConfig.authorizeDepositAndDeploy(ctx, {
        chainId: ChainId.avalancheFuji,
        recipient: RECIPIENT,
        amount: '10000000',
        vaultKey: DeployProtocol.Silo,
        token: AssetId.BTCb,
      });

      const [params] = evmOf(ctx).signStakeAndBake.mock.calls[0];
      expect(params.expiry).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Action layer: BtcStakeAndDeploy
  // ═══════════════════════════════════════════════════════════════════════

  describe('BtcStakeAndDeploy.authorizeDeposit', () => {
    let ctx: BtcCoreContext;
    let authorizeSpy: MockInstance<
      typeof stakeAndDeployConfig.authorizeStakeAndBake
    >;

    beforeEach(() => {
      ctx = buildCtx(ChainId.sepolia);

      // No stored signature on the server, so prepare() lands on
      // NEEDS_DEPLOY_AUTHORIZATION and authorizeDeposit() actually signs.
      vi.spyOn(
        stakeAndDeployConfig,
        'restoreStakeAndBakeSignature',
      ).mockResolvedValue(null);

      authorizeSpy = vi
        .spyOn(stakeAndDeployConfig, 'authorizeStakeAndBake')
        .mockResolvedValue({ signature: '0xsig', typedData: '{}' });
    });

    async function prepared() {
      const action = new BtcStakeAndDeploy(ctx, {
        assetOut: AssetId.LBTC,
        destChain: Chain.SEPOLIA,
        protocol: DeployProtocol.Veda,
      });
      await action.prepare({ amount: AMOUNT, recipient: RECIPIENT });
      return action;
    }

    it('forwards expiry to the config layer', async () => {
      const action = await prepared();

      await action.authorizeDeposit({ expiry: CUSTOM_EXPIRY });

      expect(authorizeSpy).toHaveBeenCalledWith(
        ctx,
        expect.objectContaining({ expiry: CUSTOM_EXPIRY }),
      );
    });

    it('omits expiry when authorizeDeposit is called with no options', async () => {
      const action = await prepared();

      await action.authorizeDeposit();

      const [, params] = authorizeSpy.mock.calls[0];
      expect(params.expiry).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Action layer: BtcDepositAndDeploy
  // ═══════════════════════════════════════════════════════════════════════

  describe('BtcDepositAndDeploy.authorizeDeposit', () => {
    it('forwards expiry to the config layer', async () => {
      const ctx = buildCtx(ChainId.avalancheFuji);
      const authorizeSpy = vi
        .spyOn(depositAndDeployConfig, 'authorizeDepositAndDeploy')
        .mockResolvedValue({ signature: '0xsig', typedData: '{}' });

      const action = new BtcDepositAndDeploy(ctx, {
        assetOut: AssetId.BTCb,
        sourceChain: Chain.BITCOIN_SIGNET,
        destChain: Chain.AVALANCHE_FUJI,
        protocol: DeployProtocol.Silo,
      });
      await action.prepare({ amount: AMOUNT, recipient: RECIPIENT });

      await action.authorizeDeposit({ expiry: CUSTOM_EXPIRY });

      expect(authorizeSpy).toHaveBeenCalledWith(
        ctx,
        expect.objectContaining({ expiry: CUSTOM_EXPIRY }),
      );
    });
  });
});
