/**
 * A BTC deposit to Ethereum reads the fee approval on file in `prepare()`:
 * through the v2 route when the config's `auth` yields a token, through the v1
 * route otherwise. These drive the real config, module, service and
 * api-function down to the transport, so they pin that the config's `auth` is
 * what reaches the request, and that a host without one keeps working.
 */
import type { LombardAuth } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';
import type { EIP1193Provider } from 'viem';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { axiosFn } = vi.hoisted(() => ({ axiosFn: vi.fn() }));
vi.mock('axios', () => ({ default: axiosFn, isAxiosError: () => false }));

import { btcStake } from '../../../chains/btc/actions/deposit-lbtc';
import { ChainId } from '../../../common/chains';
import { AssetId, Chain } from '../../../core';
import { BtcActionStatus } from '../../../shared/constants/statusConstants';
import { Token } from '../../../tokens/token-addresses';
import { getTokenContractInfo } from '../../../tokens/tokens';
import { createTestConfig } from '../../helpers/createTestConfig';

const RECIPIENT = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
const FEE_APPROVALS = `https://api.lombard.finance/v2/mint-with-fee/fee-approvals/${RECIPIENT}`;
const V1_FEE_SIGNATURE =
  'https://mainnet.prod.lombard.finance/api/v1/claimer/get-user-signature';

const provider = {
  request: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
} as unknown as EIP1193Provider;

function stakeToEthereum(auth?: LombardAuth) {
  const config = {
    ...createTestConfig({ env: Env.prod, providers: { evm: () => provider } }),
    ...(auth ? { auth } : {}),
  };
  return btcStake(config, {
    assetOut: AssetId.LBTC,
    destChain: Chain.ETHEREUM,
  });
}

function requestsTo(url: string) {
  return axiosFn.mock.calls
    .map(
      ([config]) => config as { url: string; headers: Record<string, string> },
    )
    .filter((config) => config.url === url);
}

beforeEach(async () => {
  const lbtc = await getTokenContractInfo(
    Token.LBTC,
    ChainId.ethereum,
    Env.prod,
  );
  axiosFn.mockImplementation(async (config: { url: string }) => {
    if (config.url === FEE_APPROVALS) {
      return {
        status: 200,
        headers: {},
        data: {
          fee_approvals: [
            {
              address: RECIPIENT,
              asset: {
                address: lbtc.address.toLowerCase(),
                asset_type: 'lbtc',
              },
              chain: 'ethereum',
              delayed: false,
              expires_at: '2030-01-01T00:00:00Z',
            },
          ],
        },
      };
    }
    if (config.url === V1_FEE_SIGNATURE) {
      return {
        status: 200,
        headers: {},
        data: { has_signature: true, expiration_date: '1893456000' },
      };
    }
    // The deposit-address lookup: nothing held, so this is a new deposit.
    throw new Error(`not found: ${config.url}`);
  });
});

afterEach(() => vi.resetAllMocks());

describe('BTC deposit to Ethereum, fee approval read', () => {
  it('reads with the config token and reuses the approval in force', async () => {
    const stake = stakeToEthereum({ getToken: async () => 'wallet-jwt' });

    await stake.prepare({ amount: '0.001', recipient: RECIPIENT });

    expect(stake.status).toBe(BtcActionStatus.READY);
    const [read] = requestsTo(FEE_APPROVALS);
    expect(read?.headers.Authorization).toBe('Bearer wallet-jwt');
    expect(requestsTo(V1_FEE_SIGNATURE)).toHaveLength(0);
  });

  it('reads the v1 route without a token, and prepare() completes as before', async () => {
    const stake = stakeToEthereum();

    await stake.prepare({ amount: '0.001', recipient: RECIPIENT });

    expect(stake.status).toBe(BtcActionStatus.READY);
    const [read] = requestsTo(V1_FEE_SIGNATURE);
    expect(read).toBeDefined();
    expect(read?.headers.Authorization).toBeUndefined();
    expect(requestsTo(FEE_APPROVALS)).toHaveLength(0);
  });
});
