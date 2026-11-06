/**
 * A vault deposit resumes only on its own permit.
 *
 * `prepare()` asks the permit read whether a live stake-and-bake permit is on
 * file for the wallet and chain, and a live one that covers the deposit used
 * to make the action report it authorised. Any product that deposits through
 * stake and bake stores permits the same way, so the question has to be
 * whether this route's permit is on file:
 *
 * - The v2 route, read with a wallet token, lists every unused permit on the
 *   chain with its token and spender. Two LBTC permits for two spenders are
 *   two products' permits, and only the spender tells them apart.
 * - The v1 route, read without one, reports whichever permit was stored last,
 *   naming neither. Another product's BTC.b permit looks exactly like this
 *   route's LBTC one, and its raw satoshis cover the ratio-converted amount.
 *
 * Adopting another product's permit reports the deposit as headed for the
 * vault while nothing will move it there: the BTC mints as plain LBTC. These
 * drive the real permit read and the real action, with only the HTTP layer
 * and the exchange ratio stubbed.
 */

import type { LombardAuth } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { httpRequest, httpGet } = vi.hoisted(() => ({
  httpRequest: vi.fn(),
  httpGet: vi.fn(),
}));
vi.mock('../../../utils/http', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  httpRequest,
  httpGet,
}));
vi.mock(
  '../../../api-functions/getLBTCExchangeRate/get-exchange-ratio',
  () => ({
    getExchangeRatio: vi.fn(async () => ({
      LBTC: {
        tokenBTCRatio: new BigNumber('0.99736'),
        BTCTokenRatio: new BigNumber('1.00265'),
      },
    })),
  }),
);

import { BtcDeployLbtc } from '../../../chains/btc/actions/deploy-lbtc/BtcDeployLbtc';
import { AssetId, Chain } from '../../../core';
import { DefiProtocol } from '../../../defi';
import { BtcActionStatus } from '../../../shared/constants/statusConstants';
import { createBtcActionHarness } from '../../harness/createBtcActionHarness';

const RECIPIENT = '0x1111111111111111111111111111111111111111';
const HELD_ADDRESS = 'bc1qexistinglbtcdeposit000000000000000000';

/** Prod LBTC and BTC.b on Ethereum. */
const LBTC = '0x8236a87084f8b84306f72007f36f2618a5634494';
const BTCB = '0xB0F70C0bD6FD87dbEb7C10dC692a2a6106817072';
/** The vault's stake-and-bake spender on Ethereum, and any other contract. */
const EARN_SPENDER = '0xC8bbF6153D7Ba105f1399D992ebd32B0541996ef';
const OTHER_SPENDER = '0x000000000000000000000000000000000000dEaD';

const auth: LombardAuth = { getToken: async () => 'wallet-jwt' };

function futureExpiry(offset = 3600): string {
  return String(Math.floor(Date.now() / 1000) + offset);
}

/** A permit as the v2 list writes it. */
function permit(nonce: string, amount: string, token: string, spender: string) {
  return {
    blocked: false,
    deposit_amount: amount,
    expiration_date: futureExpiry(),
    expired: false,
    nonce,
    spender_address: spender,
    token_address: token,
  };
}

function v2Lists(permits: unknown[]) {
  httpRequest.mockResolvedValue({
    data: { max_permits_per_token: '2', permits },
    status: 200,
    headers: {},
  });
}

/**
 * What v1 returns for another product's live 0.001 BTC.b permit: the
 * signature and the figures, no token, no spender.
 */
function v1ReportsAnotherProductsPermit() {
  httpGet.mockResolvedValue({
    data: {
      user_destination_address: RECIPIENT,
      signature: '0xpermitsignedforanotherproduct',
      expiration_date: futureExpiry(),
      deposit_amount: '100000',
      chain_id: '1',
    },
    status: 200,
    headers: {},
  });
}

function makeAction({
  heldAddress,
  withToken,
}: {
  heldAddress?: string;
  withToken: boolean;
}) {
  const h = createBtcActionHarness({
    env: Env.prod,
    api: { getDepositAddress: async () => heldAddress },
  });
  if (withToken) Object.assign(h.ctx, { auth });

  const action = new BtcDeployLbtc(h.ctx, {
    assetOut: AssetId.LBTC,
    destChain: Chain.ETHEREUM,
    sourceChain: Chain.BITCOIN_MAINNET,
    protocol: DefiProtocol.BitcoinEarn,
  });
  return { h, action };
}

beforeEach(() => {
  httpRequest.mockReset();
  httpGet.mockReset();
});

describe('BtcDeployLbtc with another product’s permit on the v1 record', () => {
  beforeEach(() => v1ReportsAnotherProductsPermit());

  it('blocks rather than resuming on a held address', async () => {
    const { h, action } = makeAction({
      heldAddress: HELD_ADDRESS,
      withToken: false,
    });

    await action.prepare({ amount: '0.001', recipient: RECIPIENT });

    // The v1 route was the one read.
    expect(httpGet).toHaveBeenCalledTimes(1);
    expect(httpRequest).not.toHaveBeenCalled();

    expect(action.status).toBe(
      BtcActionStatus.BLOCKED_BY_EXISTING_AUTHORIZATION,
    );
    expect(action.existingAuthorization).toEqual({
      depositAmount: '100000',
      expiresAt: expect.stringMatching(/^\d+$/),
    });
    // Not authorised: the held address is not offered, and nothing is signed.
    await expect(action.generateDepositAddress()).rejects.toThrow();
    expect(h.calls.of('evm', 'signStakeAndBake')).toHaveLength(0);
  });

  it('blocks rather than requesting an address with its signature', async () => {
    const { h, action } = makeAction({ withToken: false });

    await action.prepare({ amount: '0.001', recipient: RECIPIENT });

    expect(action.status).toBe(
      BtcActionStatus.BLOCKED_BY_EXISTING_AUTHORIZATION,
    );
    await expect(action.generateDepositAddress()).rejects.toThrow();
    // The other product's signature never goes out as this deposit's proof.
    expect(h.calls.of('api', 'generateDepositAddress')).toHaveLength(0);
    expect(h.calls.of('evm', 'signStakeAndBake')).toHaveLength(0);
  });
});

describe('BtcDeployLbtc reading the v2 list', () => {
  it("resumes on its own permit when another spender's is newer", async () => {
    v2Lists([
      permit('0', '99735', LBTC, EARN_SPENDER),
      permit('1', '900000', LBTC, OTHER_SPENDER),
    ]);
    const { action } = makeAction({
      heldAddress: HELD_ADDRESS,
      withToken: true,
    });

    await action.prepare({ amount: '0.001', recipient: RECIPIENT });

    expect(httpRequest).toHaveBeenCalledTimes(1);
    expect(httpGet).not.toHaveBeenCalled();
    expect(action.status).toBe(BtcActionStatus.ADDRESS_READY);
    await expect(action.generateDepositAddress()).resolves.toBe(HELD_ADDRESS);
  });

  it("does not resume on another spender's LBTC permit", async () => {
    v2Lists([permit('3', '500000', LBTC, OTHER_SPENDER)]);
    const { h, action } = makeAction({
      heldAddress: HELD_ADDRESS,
      withToken: true,
    });

    await action.prepare({ amount: '0.001', recipient: RECIPIENT });

    // Nothing of this route's is on file, so the wallet signs a new permit.
    expect(action.status).toBe(BtcActionStatus.NEEDS_DEPLOY_AUTHORIZATION);
    await expect(action.generateDepositAddress()).rejects.toThrow();
    expect(h.calls.of('evm', 'signStakeAndBake')).toHaveLength(0);
  });

  it("does not resume on a BTC.b permit for the vault's spender", async () => {
    v2Lists([permit('0', '100000', BTCB, EARN_SPENDER)]);
    const { action } = makeAction({
      heldAddress: HELD_ADDRESS,
      withToken: true,
    });

    await action.prepare({ amount: '0.001', recipient: RECIPIENT });

    expect(action.status).toBe(BtcActionStatus.NEEDS_DEPLOY_AUTHORIZATION);
  });
});
