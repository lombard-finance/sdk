/**
 * The Earn action routes file and cancel on the BoringQueue.
 *
 * `evm.withdraw()` on the vault route approved the AtomicQueue and handed off
 * to a helper that filed there. A request filed on that queue now waits with
 * nothing to fill it, so the approval has to name the BoringQueue, the queue
 * `withdrawEarn` files on. `evm.cancelWithdraw()` has to name the request it
 * cancels, since the BoringQueue keeps each one apart.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { readContract, simulateContract, writeContract } = vi.hoisted(() => ({
  readContract: vi.fn(),
  simulateContract: vi.fn(),
  writeContract: vi.fn(),
}));

vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn(() => ({
    readContract,
    simulateContract,
    waitForTransactionReceipt: vi.fn(async () => ({ status: 'success' })),
  })),
}));
vi.mock('../../../clients/wallet-client', () => ({
  makeWalletClient: vi.fn(() => ({ writeContract })),
}));

import { EvmCancelWithdraw } from '../../../chains/evm/actions/withdraw-vault/EvmCancelWithdraw';
import { EvmWithdrawVault } from '../../../chains/evm/actions/withdraw-vault/EvmWithdrawVault';
import { Chain, DeployProtocol } from '../../../core';
import {
  EARN_VAULT_BORING_QUEUE_CONTRACTS,
  EARN_VAULT_WITHDRAW_QUEUE_CONTRACTS,
} from '../../../vaults/lib/config';
import {
  createChainActionHarness,
  MOCK_EVM_ACCOUNT,
} from '../../harness/createChainActionHarness';

const BORING_QUEUE = EARN_VAULT_BORING_QUEUE_CONTRACTS[1]!.address;
const ATOMIC_QUEUE = EARN_VAULT_WITHDRAW_QUEUE_CONTRACTS[1].address;

const REQUEST = {
  nonce: 402,
  user: MOCK_EVM_ACCOUNT,
  assetOut: '0x8236a87084f8B84306f72007F36F2618A5634494',
  amountOfShares: 117839,
  amountOfAssets: 120345,
  creationTime: 1794141491,
  secondsToMaturity: 3600,
  secondsToDeadline: 1728000,
};

beforeEach(() => {
  vi.clearAllMocks();
  simulateContract.mockImplementation(async (call) => ({ request: call }));
  writeContract.mockResolvedValue('0xhash');
});

describe('evm.withdraw() on the vault route', () => {
  it('reads and grants the allowance to the BoringQueue', async () => {
    // Shares to spare, no allowance: prepare() asks for an approval.
    readContract.mockImplementation(async ({ functionName }) =>
      functionName === 'allowance' ? 0n : 10n ** 20n,
    );
    const h = createChainActionHarness('evm', { env: Env.prod });
    const action = new EvmWithdrawVault(h.ctx, {
      protocol: DeployProtocol.BitcoinEarn,
      sourceChain: Chain.ETHEREUM,
    });

    await action.prepare({ amount: '0.001' });
    expect(action.needsApproval).toBe(true);
    await action.approve();

    const allowanceRead = readContract.mock.calls
      .map(([call]) => call)
      .find((call) => call.functionName === 'allowance');
    expect(allowanceRead.args[1]).toBe(BORING_QUEUE);

    const approve = simulateContract.mock.calls
      .map(([call]) => call)
      .find((call) => call.functionName === 'approve');
    expect(approve.args[0]).toBe(BORING_QUEUE);
    expect(approve.args[0]).not.toBe(ATOMIC_QUEUE);
  });
});

describe('evm.cancelWithdraw()', () => {
  it('cancels the named request on the BoringQueue', async () => {
    const h = createChainActionHarness('evm', { env: Env.prod });
    const action = new EvmCancelWithdraw(h.ctx, {
      protocol: DeployProtocol.BitcoinEarn,
      chain: Chain.ETHEREUM,
      request: REQUEST,
    });

    await action.prepare();
    await action.execute();

    const [[call]] = simulateContract.mock.calls;
    expect(call.functionName).toBe('cancelOnChainWithdraw');
    expect(call.address).toBe(BORING_QUEUE);
    expect(call.args[0].nonce).toBe(402n);
  });

  it("refuses another wallet's request before anything is signed", async () => {
    const h = createChainActionHarness('evm', { env: Env.prod });
    const action = new EvmCancelWithdraw(h.ctx, {
      protocol: DeployProtocol.BitcoinEarn,
      chain: Chain.ETHEREUM,
      request: {
        ...REQUEST,
        user: '0x2222222222222222222222222222222222222222',
      },
    });

    await expect(action.prepare()).rejects.toThrow(/not the connected account/);
    expect(simulateContract).not.toHaveBeenCalled();
  });
});
