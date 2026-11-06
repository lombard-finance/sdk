/**
 * `makePublicClient` for a chain with no public RPC to fall back on.
 *
 * Sonic Blaze testnet's only public RPC, which the SDK configured and viem
 * names as the chain's default, no longer resolves. The SDK configures no RPC
 * for it, and a client for it is refused unless the caller supplies one.
 * Nothing else changes: the config loads, and every other chain gets its
 * client as before.
 */
import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import { makePublicClient } from '../../../clients/public-client';
import { getRpcUrlConfig, rpcUrlConfig } from '../../../clients/rpc-url-config';
import { ChainId } from '../../../common/chains';

describe('makePublicClient', () => {
  it('refuses Sonic Blaze testnet without an rpcUrl, naming the chain', () => {
    expect(() =>
      makePublicClient({ chainId: ChainId.sonicBlazeTestnet }),
    ).toThrow(
      'No RPC URL is configured for Sonic Blaze Testnet (chain 57054). Pass `rpcUrl` to create a client for it.',
    );
    expect(() =>
      makePublicClient({
        chainId: ChainId.sonicBlazeTestnet,
        env: Env.testnet,
      }),
    ).toThrow(/Sonic Blaze Testnet/);
  });

  it('builds a Sonic Blaze testnet client on the rpcUrl it is given', () => {
    const client = makePublicClient({
      chainId: ChainId.sonicBlazeTestnet,
      rpcUrl: 'https://rpc.example.test',
    });

    expect(client.chain?.id).toBe(57054);
    expect(client.transport.url).toBe('https://rpc.example.test');
  });

  it('builds other chains as before', () => {
    const client = makePublicClient({
      chainId: ChainId.sepolia,
      env: Env.testnet,
    });

    expect(client.chain?.id).toBe(ChainId.sepolia);
    expect(client.transport.url).toBe(
      getRpcUrlConfig(Env.testnet)[ChainId.sepolia],
    );
  });

  it('still falls back to the chain default for a chain the SDK configures no RPC for', () => {
    const client = makePublicClient({ chainId: ChainId.berachain });

    expect(rpcUrlConfig[ChainId.berachain]).toBeUndefined();
    expect(client.transport.url).toBe(client.chain?.rpcUrls.default.http[0]);
    expect(client.transport.url).toBeTruthy();
  });

  it('configures no RPC for Sonic Blaze testnet in either map', () => {
    expect(rpcUrlConfig[ChainId.sonicBlazeTestnet]).toBeUndefined();
    for (const env of [Env.prod, Env.testnet, Env.stage, Env.dev]) {
      expect(getRpcUrlConfig(env)[ChainId.sonicBlazeTestnet]).toBeUndefined();
    }
  });
});
