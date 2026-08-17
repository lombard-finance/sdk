import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import { ChainId } from '../../common/chains';
import { RPC_URL, getRpcUrlConfig, rpcUrlConfig } from '../rpc-url-config';

// Chains the SDK routes through the BFF rather than a public endpoint. Each one
// has to reach the gateway on a path the gateway actually serves.
const BFF_CHAINS = [
  ChainId.ethereum,
  ChainId.base,
  ChainId.corn,
  ChainId.katana,
  ChainId.monad,
  ChainId.sonic,
  ChainId.tac,
  ChainId.baseSepoliaTestnet,
  ChainId.holesky,
  ChainId.sepolia,
];

describe('rpc-url-config', () => {
  it('points the default transport at v2', () => {
    expect(RPC_URL).toMatch(/\/multi-rpc\/v2$/);
  });

  it.each(BFF_CHAINS)('routes chain %s through v2 in the static map', (id) => {
    expect(rpcUrlConfig[id]).toContain('/multi-rpc/v2/');
    expect(rpcUrlConfig[id]).not.toContain('/multi-rpc/proxy');
  });

  it.each([Env.prod, Env.stage, Env.dev])(
    'routes chains through v2 for env %s',
    (env) => {
      const config = getRpcUrlConfig(env);
      for (const id of BFF_CHAINS) {
        if (!config[id]?.includes('lombard-fi.com')) continue;
        expect(config[id]).toContain('/multi-rpc/v2/');
      }
    },
  );

  it('leaves non-BFF chains on their public endpoints', () => {
    expect(rpcUrlConfig[ChainId.megaeth]).not.toContain('lombard-fi.com');
    expect(rpcUrlConfig[ChainId.stable]).not.toContain('lombard-fi.com');
    expect(rpcUrlConfig[ChainId.sonicBlazeTestnet]).not.toContain(
      'lombard-fi.com',
    );
  });
});
