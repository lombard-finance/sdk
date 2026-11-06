/**
 * `EvmDeploy` moves the asset it was given, on a route it can deposit, or
 * nothing.
 *
 * `params.asset` was first never read, so every deploy moved LBTC. Once it
 * was read, anything other than LBTC or BTC.b still resolved to LBTC through
 * a default: `deploy({ asset: cbBTC })`, a natural call since cbBTC is an Earn
 * deposit asset, approved and deposited LBTC for the amount typed. And the
 * route table listed a Silo-on-Avalanche deploy this class cannot deposit:
 * it approved the Earn vault's address on Avalanche and failed only after.
 *
 * The route table is now checked when the action is built, so none of these
 * reaches a read, an approval or a deposit.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock factories are hoisted above module scope, so the doubles they close
// over have to be hoisted with them.
const { readContract, getTokenInfo, simulateContract, writeContract } =
  vi.hoisted(() => ({
    readContract: vi.fn(),
    getTokenInfo: vi.fn(),
    simulateContract: vi.fn(),
    writeContract: vi.fn(),
  }));

vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn(() => ({
    readContract,
    multicall: vi.fn(async () => [
      { status: 'success', result: 'TOKEN' },
      { status: 'success', result: 8 },
    ]),
    simulateContract,
    waitForTransactionReceipt: vi.fn(async () => ({ status: 'success' })),
  })),
}));
vi.mock('../../../clients/wallet-client', () => ({
  makeWalletClient: vi.fn(() => ({ writeContract })),
}));
vi.mock('../../../tokens/tokens', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  getTokenInfo,
}));

import {
  evmConfig,
  isDeploySupported,
} from '../../../chains/evm/actions/deploy/config';
import { EvmDeploy } from '../../../chains/evm/actions/deploy/EvmDeploy';
import { AssetId, Chain, DeployProtocol } from '../../../core';
import { RegistryErrorCode } from '../../../shared/errors';
import { Token } from '../../../tokens/token-addresses';
import { createChainActionHarness } from '../../harness/createChainActionHarness';

const EVM_RECIPIENT = '0x2222222222222222222222222222222222222222';

function build(
  overrides: Partial<ConstructorParameters<typeof EvmDeploy>[1]> = {},
  env: Env = Env.prod,
) {
  const h = createChainActionHarness('evm', { env });
  return new EvmDeploy(h.ctx, {
    asset: AssetId.LBTC,
    sourceChain: Chain.ETHEREUM,
    protocol: DeployProtocol.BitcoinEarn,
    recipient: EVM_RECIPIENT,
    ...overrides,
  });
}

/** Nothing reached the chain: no read, no approval, no transaction. */
function expectNothingSent() {
  expect(getTokenInfo).not.toHaveBeenCalled();
  expect(readContract).not.toHaveBeenCalled();
  expect(simulateContract).not.toHaveBeenCalled();
  expect(writeContract).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  readContract.mockResolvedValue(10n ** 20n);
  getTokenInfo.mockResolvedValue({
    address: '0x3333333333333333333333333333333333333333',
    decimals: 8,
  });
  simulateContract.mockResolvedValue({ request: {} });
  writeContract.mockResolvedValue('0xhash');
});

describe('EvmDeploy asset', () => {
  it('resolves LBTC when asked for LBTC', async () => {
    const action = build();

    await action.prepare({
      amount: '0.001',
      protocol: DeployProtocol.BitcoinEarn,
    });

    expect(getTokenInfo.mock.calls.map((c) => c[0])).toEqual([Token.LBTC]);
  });

  // Earn takes these as deposits elsewhere, so passing one here is the
  // natural mistake; it used to approve and deposit LBTC instead.
  it.each([AssetId.cbBTC, AssetId.WBTC])(
    'refuses %s rather than depositing LBTC in its place',
    (asset) => {
      expect(() => build({ asset })).toThrow(
        expect.objectContaining({ code: RegistryErrorCode.ROUTE_NOT_FOUND }),
      );
      expectNothingSent();
    },
  );

  // No deploy route lists BTC.b, and Earn does not take it as a deposit.
  it('refuses BTC.b, which no deploy route lists', () => {
    expect(() => build({ asset: AssetId.BTCb })).toThrow(
      expect.objectContaining({ code: RegistryErrorCode.ROUTE_NOT_FOUND }),
    );
  });
});

describe('EvmDeploy route', () => {
  it('lists no Silo route, which this class cannot deposit', () => {
    expect(
      evmConfig.routes.some((route) =>
        route.protocols.includes(DeployProtocol.Silo),
      ),
    ).toBe(false);
    expect(
      isDeploySupported(
        AssetId.LBTC,
        Chain.AVALANCHE,
        DeployProtocol.Silo,
        Env.prod,
      ),
    ).toBe(false);
  });

  // It used to read the allowance and approve the Earn vault's address on
  // Avalanche, then fail in execute().
  it('refuses Silo on Avalanche before any read or approval', () => {
    expect(() =>
      build({ sourceChain: Chain.AVALANCHE, protocol: DeployProtocol.Silo }),
    ).toThrow(
      expect.objectContaining({ code: RegistryErrorCode.ROUTE_NOT_FOUND }),
    );
    expectNothingSent();
  });

  it('refuses a chain with no Earn deploy', () => {
    expect(() => build({ sourceChain: Chain.AVALANCHE })).toThrow(
      expect.objectContaining({ code: RegistryErrorCode.ROUTE_NOT_FOUND }),
    );
  });

  it('refuses an environment with no deploy route', () => {
    expect(() => build({}, Env.testnet)).toThrow(
      expect.objectContaining({ code: RegistryErrorCode.ROUTE_NOT_FOUND }),
    );
  });

  // The protocol prepare() names picks the spender, so it is checked against
  // this action's asset and chain too.
  it('refuses a prepare() protocol that is not a route for this deploy', async () => {
    const action = build();

    await expect(
      action.prepare({ amount: '0.001', protocol: DeployProtocol.Silo }),
    ).rejects.toThrow(/not supported for LBTC/);
    expectNothingSent();
  });

  it.each([Chain.ETHEREUM, Chain.BASE, Chain.BSC])(
    'accepts LBTC into Bitcoin Earn on %s',
    (sourceChain) => {
      expect(() => build({ sourceChain })).not.toThrow();
    },
  );
});
