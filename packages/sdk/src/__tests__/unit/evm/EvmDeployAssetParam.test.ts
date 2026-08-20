/**
 * `EvmDeployParams.asset` is accepted and never read.
 *
 * Every one of the four call sites in `EvmDeploy` hardcodes `Token.LBTC`, and
 * `params.asset` appears zero times in the class body. So
 *
 *     evm.deploy({ asset: AssetId.BTCb, protocol: Veda })
 *
 * resolves cleanly and then deposits **LBTC**. A caller who names one asset gets
 * another, silently. "Deploy supports BTC.b" was never true, and PR #43's
 * registry cell would not have made it true on its own.
 *
 * This is a correctness bug independent of the 6.0.0 vocabulary work, which is
 * why it is fixed in the foundation stage rather than folded into the merge.
 * The route table in stage B will later own the (namespace, asset) resolution;
 * until then the class must at least read the parameter it advertises.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock factories are hoisted above module scope, so the doubles they close
// over have to be hoisted with them.
const { readContract, getTokenInfo } = vi.hoisted(() => ({
  readContract: vi.fn(),
  getTokenInfo: vi.fn(),
}));

vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn(() => ({
    readContract,
    multicall: vi.fn(async () => [
      { status: 'success', result: 'TOKEN' },
      { status: 'success', result: 8 },
    ]),
    simulateContract: vi.fn(async () => ({ request: {} })),
    waitForTransactionReceipt: vi.fn(async () => ({ status: 'success' })),
  })),
}));
vi.mock('../../../clients/wallet-client', () => ({
  makeWalletClient: vi.fn(() => ({ writeContract: vi.fn(async () => '0xhash') })),
}));
vi.mock('../../../tokens/tokens', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  getTokenInfo,
}));

import { EvmDeploy } from '../../../chains/evm/actions/deploy/EvmDeploy';
import { AssetId, Chain, DeployProtocol } from '../../../core';
import { Token } from '../../../tokens/token-addresses';
import { createChainActionHarness } from '../../harness/createChainActionHarness';

const EVM_RECIPIENT = '0x2222222222222222222222222222222222222222';

describe('EvmDeploy reads the asset it was given', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readContract.mockResolvedValue(10n ** 20n);
    getTokenInfo.mockResolvedValue({
      address: '0x3333333333333333333333333333333333333333',
      decimals: 8,
    });
  });

  it('resolves the BTC.b token when asked for BTC.b', async () => {
    const h = createChainActionHarness('evm', { env: Env.prod });
    const action = new EvmDeploy(h.ctx, {
      asset: AssetId.BTCb,
      sourceChain: Chain.ETHEREUM,
      protocol: DeployProtocol.Veda,
      recipient: EVM_RECIPIENT,
    });

    await action.prepare({ amount: '0.001', protocol: DeployProtocol.Veda });

    // The assertion the bug fails: whatever token the class looked up must be
    // the one the caller named.
    const tokensRequested = getTokenInfo.mock.calls.map((c) => c[0]);
    expect(tokensRequested.length).toBeGreaterThan(0);
    expect(tokensRequested).not.toContain(Token.LBTC);
    expect(tokensRequested).toContain(Token.BTCb);
  });

  it('still resolves LBTC when asked for LBTC', async () => {
    const h = createChainActionHarness('evm', { env: Env.prod });
    const action = new EvmDeploy(h.ctx, {
      asset: AssetId.LBTC,
      sourceChain: Chain.ETHEREUM,
      protocol: DeployProtocol.Veda,
      recipient: EVM_RECIPIENT,
    });

    await action.prepare({ amount: '0.001', protocol: DeployProtocol.Veda });

    expect(getTokenInfo.mock.calls.map((c) => c[0])).toContain(Token.LBTC);
  });
});
