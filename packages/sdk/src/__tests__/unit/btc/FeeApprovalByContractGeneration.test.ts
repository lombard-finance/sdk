/**
 * The signed fee approval follows the token contract, not the chain alone.
 *
 * Ethereum and Sepolia are the chains that can ask for it. There, the token
 * contracts from before the deposit fee mint with a commission the user
 * approves by signature, while the newer ones take a deposit fee inside the
 * mint and expose `getDepositFee()`. A mint into a newer contract must not ask
 * for the approval; a mint into an older one still must. Environments on the
 * same chain can run different generations, so the chain id cannot decide.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getNetworkFeeSignature } from '../../../api-functions';
import { BtcDeposit } from '../../../chains/btc/actions/deposit/BtcDeposit';
import { BtcStake } from '../../../chains/btc/actions/stake/BtcStake';
import { checkFeeAuthorization } from '../../../chains/evm/shared/feeAuth';
import { PartnerConfiguration } from '../../../client/PartnerConfiguration';
import { makePublicClient } from '../../../clients/public-client';
import { ChainId } from '../../../common/chains';
import { getMintingFee } from '../../../contract-functions';
import { isMintFeeApprovalRequired } from '../../../contract-functions/isMintFeeApprovalRequired/isMintFeeApprovalRequired';
import { AssetId, Chain } from '../../../core';
import { BtcActionStatus } from '../../../shared/constants/statusConstants';
import type { BtcCoreContext } from '../../../shared/context';
import { Token } from '../../../tokens/token-addresses';

vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn(),
}));

vi.mock('../../../api-functions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../api-functions')>()),
  getNetworkFeeSignature: vi.fn(),
}));

vi.mock('../../../contract-functions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../contract-functions')>()),
  getMintingFee: vi.fn(),
}));

const readContract = vi.fn();

const RECIPIENT = '0x000000000000000000000000000000000000aBcD';

/** The deposit fee the newer contracts report, in satoshis. */
const DEPOSIT_FEE = 3000n;

/** What a node answers for a function the contract does not have. */
const bareRevert = () =>
  Object.assign(new Error('execution reverted'), { data: '0x' });

/** The newer contract: `getDepositFee()` answers. */
function newerContract() {
  readContract.mockResolvedValue(DEPOSIT_FEE);
}

/** The older contract: `getDepositFee()` is not there. */
function olderContract() {
  readContract.mockRejectedValue(bareRevert());
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(makePublicClient).mockReturnValue({
    readContract,
  } as unknown as ReturnType<typeof makePublicClient>);
});

describe('isMintFeeApprovalRequired', () => {
  const sepolia = { chainId: ChainId.sepolia, env: Env.stage };

  it('is not required on a subsidized chain, and reads nothing', async () => {
    await expect(
      isMintFeeApprovalRequired({
        chainId: ChainId.base,
        token: Token.LBTC,
        env: Env.prod,
      }),
    ).resolves.toBe(false);
    expect(readContract).not.toHaveBeenCalled();
  });

  it.each([Token.LBTC, Token.BTCb])(
    'is not required for %s when the contract has getDepositFee',
    async (token) => {
      newerContract();

      await expect(
        isMintFeeApprovalRequired({ ...sepolia, token }),
      ).resolves.toBe(false);
    },
  );

  it.each([Token.LBTC, Token.BTCb])(
    'is required for %s when the contract predates the deposit fee',
    async (token) => {
      olderContract();

      await expect(
        isMintFeeApprovalRequired({ ...sepolia, token }),
      ).resolves.toBe(true);
    },
  );

  it('reads a zero deposit fee as the newer contract', async () => {
    readContract.mockResolvedValue(0n);

    await expect(
      isMintFeeApprovalRequired({
        chainId: ChainId.ethereum,
        token: Token.LBTC,
        env: Env.prod,
      }),
    ).resolves.toBe(false);
  });

  // The approval is the safe side of a read that failed: the newer contracts
  // accept it, and skipping it on an older one leaves a deposit nobody is
  // authorised to mint.
  it('keeps the approval when the read fails for another reason', async () => {
    readContract.mockRejectedValue(new Error('fetch failed'));

    await expect(
      isMintFeeApprovalRequired({ ...sepolia, token: Token.LBTC }),
    ).resolves.toBe(true);
  });

  it("asks the environment's own token contract", async () => {
    newerContract();

    await isMintFeeApprovalRequired({ ...sepolia, token: Token.BTCb });

    expect(makePublicClient).toHaveBeenCalledWith(
      expect.objectContaining({ chainId: ChainId.sepolia, env: Env.stage }),
    );
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0x600e4006278EB11FA1691cA0FE6C5fcfC4992d58',
        functionName: 'getDepositFee',
      }),
    );
  });
});

function buildCtx(): BtcCoreContext {
  const evm = {
    getMintingFee: vi.fn().mockResolvedValue('0.0000001'),
  };

  return {
    env: Env.stage,
    api: {
      getDepositAddress: vi.fn().mockResolvedValue(null),
      getFeeSignature: vi.fn().mockResolvedValue({ hasSignature: false }),
    },
    partner: new PartnerConfiguration({ partnerId: 'test-partner' }),
    capabilities: {
      require: vi.fn().mockReturnValue(evm),
      has: vi.fn().mockReturnValue(true),
    },
    getProvider: vi.fn(),
  } as unknown as BtcCoreContext;
}

describe.each([
  [
    'BtcStake (LBTC)',
    (ctx: BtcCoreContext) =>
      new BtcStake(ctx, {
        assetOut: AssetId.LBTC,
        sourceChain: Chain.BITCOIN_SIGNET,
        destChain: Chain.SEPOLIA,
      }),
  ],
  [
    'BtcDeposit (BTC.b)',
    (ctx: BtcCoreContext) =>
      new BtcDeposit(ctx, {
        assetOut: AssetId.BTCb,
        sourceChain: Chain.BITCOIN_SIGNET,
        destChain: Chain.SEPOLIA,
      }),
  ],
])('%s.prepare on Sepolia', (_label, build) => {
  it('confirms the address instead of asking for the fee approval when the contract has getDepositFee', async () => {
    newerContract();
    const action = build(buildCtx());

    await action.prepare({ amount: '0.001', recipient: RECIPIENT });

    expect(action.status).toBe(BtcActionStatus.NEEDS_ADDRESS_CONFIRMATION);
  });

  it('asks for the fee approval when the contract predates the deposit fee', async () => {
    olderContract();
    const action = build(buildCtx());

    await action.prepare({ amount: '0.001', recipient: RECIPIENT });

    expect(action.status).toBe(BtcActionStatus.NEEDS_FEE_AUTHORIZATION);
  });
});

describe('checkFeeAuthorization on Sepolia', () => {
  it.each([Token.LBTC, Token.BTCb])(
    'does not require it for %s when the contract has getDepositFee',
    async (token) => {
      newerContract();

      await expect(
        checkFeeAuthorization(ChainId.sepolia, RECIPIENT, Env.stage, token),
      ).resolves.toMatchObject({ requiresAuth: false });
      expect(getNetworkFeeSignature).not.toHaveBeenCalled();
    },
  );

  it('requires it when the contract predates the deposit fee', async () => {
    olderContract();
    vi.mocked(getNetworkFeeSignature).mockResolvedValue({
      hasSignature: false,
    } as Awaited<ReturnType<typeof getNetworkFeeSignature>>);
    vi.mocked(getMintingFee).mockResolvedValue(
      new (await import('bignumber.js')).default('0.00001'),
    );

    await expect(
      checkFeeAuthorization(ChainId.sepolia, RECIPIENT, Env.stage, Token.LBTC),
    ).resolves.toMatchObject({ requiresAuth: true, hasValidSignature: false });
  });
});
