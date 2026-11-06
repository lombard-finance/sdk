/**
 * A stored stake-and-bake signature is a resume only for a deposit its own
 * amount covers.
 *
 * `prepare()` looks for an unexpired signature and, finding one, marks the
 * action authorised and skips the wallet prompt. The permit behind that
 * signature is for a fixed amount. Since the expiry may be set up to a year
 * ahead, the returning-user path is the ordinary one, and it was reached
 * without the new amount ever being compared to the one that was signed for:
 * authorise 0.001 BTC, come back, prepare 0.5 BTC, and the action reports ready
 * with no prompt.
 *
 * `deposit_amount` on the record is the permit's own `value` — the store call
 * sends only the signature and the typed data, so `message.value` is the only
 * amount the server receives — which is the ratio-converted figure rather than
 * the satoshis the caller passed. These drive the real config and the real
 * action, so the conversion is part of what is under test.
 */

import { Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getExchangeRatio } from '../../../api-functions/getLBTCExchangeRate/get-exchange-ratio';
import { getUserStakeAndBakeSignature } from '../../../api-functions/getUserStakeAndBakeSignature';
import { stakeAndDeployConfig } from '../../../chains/btc/actions/deploy-lbtc/config';
import { BtcActionStatus } from '../../../chains/btc/actions/deploy-lbtc/types';
import { ChainId } from '../../../common/chains';
import { AssetId, Chain, type DeployProtocol } from '../../../core';
import type { BtcCoreContext } from '../../../shared/context';

vi.mock('../../../api-functions/getUserStakeAndBakeSignature');
vi.mock('../../../api-functions/getLBTCExchangeRate/get-exchange-ratio');

const mockedStored = vi.mocked(getUserStakeAndBakeSignature);
const mockedRatio = vi.mocked(getExchangeRatio);

const RECIPIENT = '0x1111111111111111111111111111111111111111';

/** The live ratio at the time of writing: one LBTC is a little over one BTC. */
const BTC_TOKEN_RATIO = '1.00265';

/** 0.001 BTC in satoshis, and what it permits after the ratio. */
const SMALL_SATS = '100000';
const SMALL_PERMIT_VALUE = '99735';

/** 0.5 BTC in satoshis. */
const LARGE_SATS = '50000000';

/** Prod LBTC on Ethereum, and the vault's stake-and-bake spender there. */
const LBTC = '0x8236a87084f8b84306f72007f36f2618a5634494';
const EARN_SPENDER = '0xC8bbF6153D7Ba105f1399D992ebd32B0541996ef';

/** This route's own permit, as the v2 route reports it: token and spender named. */
function onFile(depositAmount: string, signature = '0xstored') {
  mockedStored.mockResolvedValue({
    userDestinationAddress: RECIPIENT,
    signature,
    // Unexpired, and comfortably inside the year an expiry may be set to.
    expirationDate: String(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),
    depositAmount,
    chainId: String(ChainId.ethereum),
    tokenAddress: LBTC,
    spenderAddress: EARN_SPENDER,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockedRatio.mockResolvedValue({
    LBTC: {
      tokenBTCRatio: new BigNumber(1).dividedBy(BTC_TOKEN_RATIO),
      BTCTokenRatio: new BigNumber(BTC_TOKEN_RATIO),
    },
  });
});

describe('restoreStakeAndBakeSignature', () => {
  const ctx = { env: Env.prod } as unknown as BtcCoreContext;
  const required = {
    amount: SMALL_SATS,
    token: AssetId.BTC,
    protocol: 'bitcoinEarn',
  };

  async function restore(amount: string) {
    return stakeAndDeployConfig.restoreStakeAndBakeSignature(
      ctx,
      ChainId.ethereum,
      RECIPIENT,
      { ...required, amount },
    );
  }

  it('reports a signature for the same deposit as covering it', async () => {
    onFile(SMALL_PERMIT_VALUE);

    await expect(restore(SMALL_SATS)).resolves.toMatchObject({
      hasSignature: true,
      matchesRoute: true,
      coversAmount: true,
    });
  });

  it('matches the token and spender regardless of case', async () => {
    mockedStored.mockResolvedValue({
      userDestinationAddress: RECIPIENT,
      signature: '',
      expirationDate: String(Math.floor(Date.now() / 1000) + 3600),
      depositAmount: SMALL_PERMIT_VALUE,
      chainId: String(ChainId.ethereum),
      tokenAddress: LBTC.toUpperCase().replace('0X', '0x'),
      spenderAddress: EARN_SPENDER.toLowerCase(),
    });

    await expect(restore(SMALL_SATS)).resolves.toMatchObject({
      matchesRoute: true,
    });
  });

  // The v1 record is whichever permit was stored last for the wallet and
  // chain, by any product; it names no token or spender.
  it('reports a v1 record as not shown to be this route', async () => {
    mockedStored.mockResolvedValue({
      userDestinationAddress: RECIPIENT,
      signature: '0xstored',
      expirationDate: String(Math.floor(Date.now() / 1000) + 3600),
      depositAmount: SMALL_PERMIT_VALUE,
      chainId: String(ChainId.ethereum),
    });

    await expect(restore(SMALL_SATS)).resolves.toMatchObject({
      hasSignature: true,
      matchesRoute: false,
      coversAmount: true,
    });
  });

  it.each([
    [
      'another spender',
      { spenderAddress: '0x000000000000000000000000000000000000dEaD' },
    ],
    [
      'another token',
      { tokenAddress: '0x0000000000000000000000000000000000000b7C' },
    ],
  ])('reports a permit for %s as not this route', async (_label, overrides) => {
    mockedStored.mockResolvedValue({
      userDestinationAddress: RECIPIENT,
      signature: '',
      expirationDate: String(Math.floor(Date.now() / 1000) + 3600),
      depositAmount: SMALL_PERMIT_VALUE,
      chainId: String(ChainId.ethereum),
      tokenAddress: LBTC,
      spenderAddress: EARN_SPENDER,
      ...overrides,
    });

    await expect(restore(SMALL_SATS)).resolves.toMatchObject({
      matchesRoute: false,
    });
  });

  it('reports a signature for a smaller deposit as not covering a larger one', async () => {
    onFile(SMALL_PERMIT_VALUE);

    await expect(restore(LARGE_SATS)).resolves.toMatchObject({
      hasSignature: true,
      coversAmount: false,
    });
  });

  it('reports a signature for a larger deposit as covering a smaller one', async () => {
    onFile('50000000');

    await expect(restore(SMALL_SATS)).resolves.toMatchObject({
      coversAmount: true,
    });
  });

  // The satoshis passed in are not the amount the permit carries: comparing
  // them directly would call a same-amount resume short by the ratio.
  it('compares against the converted value, not the satoshis passed in', async () => {
    onFile(SMALL_PERMIT_VALUE);

    await expect(restore(SMALL_SATS)).resolves.toMatchObject({
      coversAmount: true,
    });
    expect(new BigNumber(SMALL_PERMIT_VALUE).isLessThan(SMALL_SATS)).toBe(true);
  });

  // Nothing can be shown to cover a deposit if the record carries no amount.
  // Costing a prompt that may not have been needed is the safe direction.
  it.each([
    ['no amount at all', undefined],
    ['an empty amount', ''],
    ['a non-numeric amount', 'unknown'],
  ])('reports %s as not covering', async (_label, amount) => {
    onFile(amount as string);

    await expect(restore(SMALL_SATS)).resolves.toMatchObject({
      coversAmount: false,
    });
  });

  it('still reports an expired signature as absent', async () => {
    mockedStored.mockResolvedValue({
      userDestinationAddress: RECIPIENT,
      signature: '0xstored',
      expirationDate: String(Math.floor(Date.now() / 1000) - 60),
      depositAmount: SMALL_PERMIT_VALUE,
      chainId: String(ChainId.ethereum),
    });

    await expect(restore(SMALL_SATS)).resolves.toBeNull();
  });
});

/**
 * The lookup takes the v2 route when a wallet token is available, so the
 * action's way of getting one has to reach it.
 */
describe('restoreStakeAndBakeSignature and the wallet token', () => {
  const auth = { getToken: async () => 'jwt' };
  const getAuthToken = () => 'sync-jwt';
  const ctx = {
    env: Env.prod,
    auth,
    getAuthToken,
  } as unknown as BtcCoreContext;

  function restore() {
    return stakeAndDeployConfig.restoreStakeAndBakeSignature(
      ctx,
      ChainId.ethereum,
      RECIPIENT,
      { amount: SMALL_SATS, token: AssetId.BTC, protocol: 'bitcoinEarn' },
    );
  }

  it("passes the context's wallet auth to the lookup", async () => {
    onFile(SMALL_PERMIT_VALUE);

    await restore();

    expect(mockedStored).toHaveBeenCalledWith(
      expect.objectContaining({ auth, getAuthToken }),
    );
  });

  // The v2 list holds every token's permits on the chain. A BTC deposit is
  // signed against LBTC, so only LBTC permits say anything about it.
  it('asks for the permits of the token the deposit is signed against', async () => {
    onFile(SMALL_PERMIT_VALUE);

    await restore();

    expect(mockedStored).toHaveBeenCalledWith(
      expect.objectContaining({
        // LBTC on Ethereum.
        tokenAddress: '0x8236a87084f8b84306f72007f36f2618a5634494',
      }),
    );
  });

  // Two products can hold LBTC permits on one chain, and the token's list
  // reports the newest. When that is another spender's, this route's own is
  // looked up by its spender, since it can sit at a lower nonce.
  it("looks up the vault's own permit when the newest is another spender's", async () => {
    const live = String(Math.floor(Date.now() / 1000) + 3600);
    mockedStored
      .mockResolvedValueOnce({
        userDestinationAddress: RECIPIENT,
        signature: '',
        expirationDate: live,
        depositAmount: '50000',
        chainId: String(ChainId.ethereum),
        tokenAddress: LBTC,
        spenderAddress: '0x000000000000000000000000000000000000dEaD',
      })
      .mockResolvedValueOnce({
        userDestinationAddress: RECIPIENT,
        signature: '',
        expirationDate: live,
        depositAmount: SMALL_PERMIT_VALUE,
        chainId: String(ChainId.ethereum),
        tokenAddress: LBTC,
        spenderAddress: EARN_SPENDER,
      });

    await expect(restore()).resolves.toMatchObject({
      matchesRoute: true,
      coversAmount: true,
      depositAmount: SMALL_PERMIT_VALUE,
    });
    expect(mockedStored).toHaveBeenCalledTimes(2);
    expect(mockedStored.mock.calls[0][0]).not.toHaveProperty('spenderAddress');
    expect(mockedStored.mock.calls[1][0]).toMatchObject({
      spenderAddress: EARN_SPENDER,
    });
  });

  it("reports another spender's permit, when the vault has none, as not this route", async () => {
    const foreign = {
      userDestinationAddress: RECIPIENT,
      signature: '',
      expirationDate: String(Math.floor(Date.now() / 1000) + 3600),
      depositAmount: '500000',
      chainId: String(ChainId.ethereum),
      tokenAddress: LBTC,
      spenderAddress: '0x000000000000000000000000000000000000dEaD',
    };
    mockedStored.mockResolvedValueOnce(foreign).mockResolvedValueOnce({
      ...foreign,
      expirationDate: '',
      depositAmount: '',
      tokenAddress: undefined,
      spenderAddress: undefined,
    });

    await expect(restore()).resolves.toMatchObject({
      hasSignature: true,
      matchesRoute: false,
      depositAmount: '500000',
    });
  });

  it('reads a lookup failure as no permit', async () => {
    mockedStored.mockRejectedValue(new Error('gateway unreachable'));

    await expect(restore()).resolves.toBeNull();
  });
});

describe('BtcDeployLbtc.prepare with a signature on file', () => {
  const HELD_ADDRESS = 'bc1qexistingdeposit000000000000000000000';

  async function action({ heldAddress }: { heldAddress?: string } = {}) {
    const ctx = {
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
      api: { getDepositAddress: vi.fn().mockResolvedValue(heldAddress) },
      partner: { getPartnerId: () => undefined },
    } as unknown as BtcCoreContext;

    const { BtcDeployLbtc } =
      await import('../../../chains/btc/actions/deploy-lbtc/BtcDeployLbtc');

    return new BtcDeployLbtc(ctx, {
      assetOut: AssetId.LBTC,
      sourceChain: Chain.BITCOIN_MAINNET,
      destChain: Chain.ETHEREUM,
      protocol: 'bitcoinEarn' as DeployProtocol,
    });
  }

  it('skips the prompt for the deposit the signature was signed for', async () => {
    onFile(SMALL_PERMIT_VALUE);
    const subject = await action({ heldAddress: HELD_ADDRESS });

    await subject.prepare({ amount: '0.001', recipient: RECIPIENT });

    expect(subject.status).toBe(BtcActionStatus.ADDRESS_READY);
  });

  // With no address to resume onto, the signature would have to go out with
  // an address request, and with it the typed data no route returns.
  it('stops rather than going ready when no address is held', async () => {
    onFile(SMALL_PERMIT_VALUE);
    const subject = await action();

    await subject.prepare({ amount: '0.001', recipient: RECIPIENT });

    expect(subject.status).toBe(
      BtcActionStatus.BLOCKED_BY_EXISTING_AUTHORIZATION,
    );
  });

  /**
   * The case with no symptom: the BTC is sent and minted, and the vault leg is
   * authorised for a fraction of it.
   *
   * It does not ask for authorisation again, because that request cannot
   * succeed. One signature is kept per wallet and chain while it is unexpired
   * and unused, so the API refuses a second one — and re-signing carries the
   * same nonce anyway, since ERC-2612 advances it only when a permit is spent.
   */
  it('stops rather than prompting when the deposit outgrows the signature', async () => {
    onFile(SMALL_PERMIT_VALUE);
    const subject = await action();

    await subject.prepare({ amount: '0.5', recipient: RECIPIENT });

    expect(subject.status).toBe(
      BtcActionStatus.BLOCKED_BY_EXISTING_AUTHORIZATION,
    );
  });

  it('reports what is on file and until when', async () => {
    onFile(SMALL_PERMIT_VALUE);
    const subject = await action();

    await subject.prepare({ amount: '0.5', recipient: RECIPIENT });

    expect(subject.existingAuthorization).toEqual({
      depositAmount: SMALL_PERMIT_VALUE,
      expiresAt: expect.stringMatching(/^\d+$/),
    });
  });

  it('leaves the action unauthorised, so it cannot generate an address', async () => {
    onFile(SMALL_PERMIT_VALUE);
    const subject = await action();

    await subject.prepare({ amount: '0.5', recipient: RECIPIENT });

    await expect(subject.generateDepositAddress()).rejects.toThrow();
  });

  // An expired signature is a different case: nothing is on file server-side,
  // so the wallet can sign a new one and the prompt is worth showing.
  it('still asks for authorisation when the stored signature has expired', async () => {
    mockedStored.mockResolvedValue({
      userDestinationAddress: RECIPIENT,
      signature: '0xstored',
      expirationDate: String(Math.floor(Date.now() / 1000) - 60),
      depositAmount: SMALL_PERMIT_VALUE,
      chainId: String(ChainId.ethereum),
    });
    const subject = await action();

    await subject.prepare({ amount: '0.5', recipient: RECIPIENT });

    expect(subject.status).toBe(BtcActionStatus.NEEDS_DEPLOY_AUTHORIZATION);
    expect(subject.existingAuthorization).toBeUndefined();
  });

  /**
   * The route may answer with the record and no signature — the config's own
   * comment says so, and it reports `hasSignature: true` off an unexpired
   * `expirationDate` alone. READY is reachable only from this branch, and from
   * there `generateDepositAddress()` sends the signature as proof of control
   * over the destination, so without the bytes it would forward `undefined`
   * from a state the action had called ready.
   */
  it('does not go ready on a record that carries no signature', async () => {
    onFile(SMALL_PERMIT_VALUE, '');
    const subject = await action();

    await subject.prepare({ amount: '0.001', recipient: RECIPIENT });

    expect(subject.status).toBe(
      BtcActionStatus.BLOCKED_BY_EXISTING_AUTHORIZATION,
    );
    expect(subject.existingAuthorization).toMatchObject({
      depositAmount: SMALL_PERMIT_VALUE,
    });
  });

  it('asks for authorisation when nothing is on file at all', async () => {
    mockedStored.mockRejectedValue(new Error('no stored signature'));
    const subject = await action();

    await subject.prepare({ amount: '0.5', recipient: RECIPIENT });

    expect(subject.status).toBe(BtcActionStatus.NEEDS_DEPLOY_AUTHORIZATION);
    expect(subject.existingAuthorization).toBeUndefined();
  });
});
