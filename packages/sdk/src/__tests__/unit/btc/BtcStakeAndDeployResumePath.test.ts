/**
 * Resume-path regression tests for BtcStakeAndDeploy.
 *
 * Each test here corresponds to a defect found while designing the BTC action
 * consolidation. They matter disproportionately because the consolidation makes
 * this class's resume logic the *only* resume implementation — there is no
 * second class to fall back to once the four BTC actions merge.
 *
 * These are also, together with the golden baseline, the first tests in the repo
 * that construct this class.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../api-functions/getUserStakeAndBakeSignature', () => ({
  getUserStakeAndBakeSignature: vi.fn(),
}));

import { getUserStakeAndBakeSignature } from '../../../api-functions/getUserStakeAndBakeSignature';
import { BtcStakeAndDeploy } from '../../../chains/btc/actions/stakeAndDeploy/BtcStakeAndDeploy';
import { AssetId, Chain } from '../../../core';
import { DefiProtocol } from '../../../defi';
import { BtcActionStatus } from '../../../shared/constants/statusConstants';
import { createBtcActionHarness } from '../../harness/createBtcActionHarness';

const RECIPIENT = '0x1111111111111111111111111111111111111111';
const EXISTING_ADDRESS = 'tb1qexistingdeposit0000000000000000000000';
const AMOUNT = '0.001';

const mockRestore = vi.mocked(getUserStakeAndBakeSignature);

function futureExpiry(): string {
  return String(Math.floor(Date.now() / 1000) + 3600);
}

/**
 * A complete stored-signature response. `signature` is deliberately
 * overridable: the API returns an empty string when a signature exists on the
 * server but is not included in the response body, which is the case the
 * restore logic has to treat as "not authorized".
 */
function storedSignature(
  overrides: Partial<
    Awaited<ReturnType<typeof getUserStakeAndBakeSignature>>
  > = {},
): Awaited<ReturnType<typeof getUserStakeAndBakeSignature>> {
  return {
    userDestinationAddress: RECIPIENT,
    signature: '0xstoredsignature',
    expirationDate: futureExpiry(),
    depositAmount: '100000',
    chainId: '1',
    ...overrides,
  };
}

function makeAction(
  harnessOpts: Parameters<typeof createBtcActionHarness>[0] = {},
) {
  const h = createBtcActionHarness({ env: Env.prod, ...harnessOpts });
  const action = new BtcStakeAndDeploy(h.ctx, {
    assetOut: AssetId.LBTC,
    destChain: Chain.ETHEREUM,
    sourceChain: Chain.BITCOIN_MAINNET,
    protocol: DefiProtocol.Veda,
  });
  h.observe(action);
  return { h, action };
}

describe('BtcStakeAndDeploy — resume path', () => {
  beforeEach(() => {
    mockRestore.mockReset();
    mockRestore.mockRejectedValue(new Error('not found'));
  });

  describe('the documented call sequence after a resume', () => {
    beforeEach(() => {
      mockRestore.mockResolvedValue(storedSignature());
    });

    it('reaches ADDRESS_READY when a deposit and signature already exist', async () => {
      const { action } = makeAction({
        api: { getDepositAddress: async () => EXISTING_ADDRESS },
      });

      await action.prepare({ amount: AMOUNT, recipient: RECIPIENT });

      expect(action.status).toBe(BtcActionStatus.ADDRESS_READY);
      expect(action.depositAddress).toBe(EXISTING_ADDRESS);
    });

    it('accepts authorizeDeposit() from ADDRESS_READY as a no-op', async () => {
      // The sequence in the class's own JSDoc — prepare, authorizeDeposit,
      // generateDepositAddress — used to throw INVALID_STATE here for every
      // returning user.
      const { h, action } = makeAction({
        api: { getDepositAddress: async () => EXISTING_ADDRESS },
      });

      await action.prepare({ amount: AMOUNT, recipient: RECIPIENT });
      await expect(action.authorizeDeposit()).resolves.toBeUndefined();

      expect(action.status).toBe(BtcActionStatus.ADDRESS_READY);
      // No signing round-trip: it was already authorized.
      expect(h.calls.of('evm', 'signStakeAndBake')).toHaveLength(0);
    });

    it('returns the held address from generateDepositAddress() without calling the API', async () => {
      const { h, action } = makeAction({
        api: { getDepositAddress: async () => EXISTING_ADDRESS },
      });

      await action.prepare({ amount: AMOUNT, recipient: RECIPIENT });
      const address = await action.generateDepositAddress();

      expect(address).toBe(EXISTING_ADDRESS);
      expect(h.calls.of('api', 'generateDepositAddress')).toHaveLength(0);
    });
  });

  describe('a stored signature with no signature string', () => {
    it('requires re-authorization instead of posting an empty signature', async () => {
      // restoreStakeAndBakeSignature reports hasSignature: true when the API
      // returns only metadata. Treating that as authorized sent
      // `signature: undefined` to the deposit-address endpoint.
      mockRestore.mockResolvedValue(storedSignature({ signature: '' }));

      const { action } = makeAction({
        api: { getDepositAddress: async () => EXISTING_ADDRESS },
      });

      await action.prepare({ amount: AMOUNT, recipient: RECIPIENT });

      expect(action.status).toBe(BtcActionStatus.NEEDS_DEPLOY_AUTHORIZATION);
    });

    it('does not advance to READY when no deposit exists either', async () => {
      mockRestore.mockResolvedValue(storedSignature({ signature: '' }));

      const { action } = makeAction();

      await action.prepare({ amount: AMOUNT, recipient: RECIPIENT });

      expect(action.status).toBe(BtcActionStatus.NEEDS_DEPLOY_AUTHORIZATION);
    });
  });

  describe('assetIn validation', () => {
    it.each([AssetId.LBTC, AssetId.BTCb])(
      'rejects assetIn=%s, which would authorize the wrong amount',
      (assetIn) => {
        const h = createBtcActionHarness({ env: Env.prod });

        expect(
          () =>
            new BtcStakeAndDeploy(h.ctx, {
              assetIn,
              assetOut: AssetId.LBTC,
              destChain: Chain.ETHEREUM,
              sourceChain: Chain.BITCOIN_MAINNET,
              protocol: DefiProtocol.Veda,
            }),
        ).toThrow(/assetIn must be/);
      },
    );

    it('accepts an explicit assetIn of BTC', () => {
      const h = createBtcActionHarness({ env: Env.prod });

      expect(
        () =>
          new BtcStakeAndDeploy(h.ctx, {
            assetIn: AssetId.BTC,
            assetOut: AssetId.LBTC,
            destChain: Chain.ETHEREUM,
            sourceChain: Chain.BITCOIN_MAINNET,
            protocol: DefiProtocol.Veda,
          }),
      ).not.toThrow();
    });
  });

  describe('source-chain resolution', () => {
    it.each([
      [Env.prod, 'mainnet'],
      [Env.testnet, 'testnet'],
      [Env.stage, 'testnet'],
      [Env.dev, 'testnet'],
    ] as const)(
      'monitors the %s network when sourceChain is omitted',
      (env, expected) => {
        const h = createBtcActionHarness({ env });
        const action = new BtcStakeAndDeploy(h.ctx, {
          assetOut: AssetId.LBTC,
          destChain: Chain.ETHEREUM,
          protocol: DefiProtocol.Veda,
        });

        // bitcoinNetwork is protected; assert through the resolved value it
        // derives from, which is the thing that used to disagree with env.
        const resolved = (action as unknown as { resolvedSourceChain: Chain })
          .resolvedSourceChain;

        expect(resolved === Chain.BITCOIN_MAINNET ? 'mainnet' : 'testnet').toBe(
          expected,
        );
      },
    );
  });
});
