/**
 * The Silo/BTC.b vault route has to be reachable at all
 *
 * `btc.deploy({ assetOut: BTC.b })` threw on every environment since 4.0.0,
 * for two reasons that each looked like the other's symptom.
 *
 * `EvmService.getStakeAndBakeFee` did not pass `env`, so it fell back to
 * `DEFAULT_ENV = prod` — and Silo is registered only under `testnet`, so the
 * lookup reported `Environment prod is not supported` even when the caller had
 * asked for testnet. Fixing that surfaced the second: the barrel exported the
 * ABI through `import * as`, which turns a top-level JSON array into a
 * namespace object with numeric keys, so the call failed with
 * `abi is not iterable`.
 *
 * Both are the kind of defect a type assertion hides — `abi as Abi` compiles
 * either way — so this asserts the shapes rather than the call.
 */

import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import { DEFI_REGISTRY, DefiProtocol } from '../../../defi/defi-registry';
import { Token } from '../../../tokens/token-addresses';
import { SILO_VAULT_SPENDER_ABI, VEDA_VAULT_SPENDER_ABI } from '../../../vaults/abi';

describe('the vault spender ABIs', () => {
  it('are arrays, not namespace objects', () => {
    expect(Array.isArray(SILO_VAULT_SPENDER_ABI)).toBe(true);
    expect(Array.isArray(VEDA_VAULT_SPENDER_ABI)).toBe(true);
  });

  it('are iterable, which is what viem needs of an ABI', () => {
    expect(() => [...SILO_VAULT_SPENDER_ABI]).not.toThrow();
    expect(SILO_VAULT_SPENDER_ABI.length).toBeGreaterThan(0);
  });
});

describe('the Silo BTC.b route', () => {
  const silo = DEFI_REGISTRY[DefiProtocol.Silo]?.[Token.BTCb];

  it('is registered for testnet', () => {
    expect(silo?.[Env.testnet]).toBeDefined();
  });

  /**
   * Pinned so the next reader knows the prod and stage errors are correct
   * rather than the same bug wearing a different message.
   */
  it('is deliberately absent on prod and stage', () => {
    expect(silo?.[Env.prod]).toBeUndefined();
    expect(silo?.[Env.stage]).toBeUndefined();
  });

  it('carries an iterable spender ABI on the chains it does serve', () => {
    for (const entry of Object.values(silo?.[Env.testnet] ?? {})) {
      const abi = (entry as { spenderContract: { abi: unknown } }).spenderContract.abi;

      expect(Array.isArray(abi)).toBe(true);
    }
  });
});
