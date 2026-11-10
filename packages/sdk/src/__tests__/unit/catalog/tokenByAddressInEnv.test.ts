/**
 * The chain-agnostic token resolver.
 *
 * The per-chain lookup needs token, environment and chain to line up, so it
 * returned nothing whenever the backend reported a deposit on a chain the token
 * is not registered for. That is not a rare edge: BTC.b on stage is registered
 * for Sepolia only, and the backend reports BTC.b deposits landing on Katana.
 * The playground then labelled those rows LBTC, because its fallback could only
 * ever produce LBTC.
 *
 * These pin both halves: that the resolver finds the token the per-chain
 * lookup misses, and that it refuses to answer when it cannot be sure.
 *
 * @module __tests__/unit/catalog/tokenByAddressInEnv.test
 */

import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import { ChainId } from '../../../common/chains';
import {
  AddressKind,
  getTokenByAddress,
  getTokenByAddressInEnv,
  Token,
} from '../../../tokens/token-addresses';

/** The BTC.b adapter on stage, taken from a live stage deposit response. */
const BTCB_ADAPTER_STAGE = '0x600e4006278EB11FA1691cA0FE6C5fcfC4992d58';

describe('getTokenByAddressInEnv', () => {
  it('resolves a BTC.b address the per-chain lookup cannot', () => {
    // Katana is a destination the backend reports for BTC.b, and one BTC.b is
    // not registered for — which is exactly the case that produced the bug.
    const perChain = getTokenByAddress(
      BTCB_ADAPTER_STAGE,
      ChainId.katana,
      Env.stage,
      AddressKind.Adapter,
    );
    expect(perChain).toBeUndefined();

    expect(
      getTokenByAddressInEnv(
        BTCB_ADAPTER_STAGE,
        Env.stage,
        AddressKind.Adapter,
      ),
    ).toBe(Token.BTCb);
  });

  it('still resolves through the per-chain path where it does work', () => {
    // Sepolia is where BTC.b is registered on stage, so both agree there.
    expect(
      getTokenByAddress(
        BTCB_ADAPTER_STAGE,
        ChainId.sepolia,
        Env.stage,
        AddressKind.Adapter,
      ),
    ).toBe(Token.BTCb);
  });

  it('does not answer for an address it does not know', () => {
    expect(
      getTokenByAddressInEnv(
        '0x000000000000000000000000000000000000dead',
        Env.stage,
        AddressKind.Adapter,
      ),
    ).toBeUndefined();
  });

  it('does not answer without an address', () => {
    expect(getTokenByAddressInEnv(undefined, Env.stage)).toBeUndefined();
    expect(getTokenByAddressInEnv('', Env.stage)).toBeUndefined();
  });

  it('is case-insensitive, since the backend does not promise a checksum', () => {
    expect(
      getTokenByAddressInEnv(
        BTCB_ADAPTER_STAGE.toLowerCase(),
        Env.stage,
        AddressKind.Adapter,
      ),
    ).toBe(Token.BTCb);
  });
});
