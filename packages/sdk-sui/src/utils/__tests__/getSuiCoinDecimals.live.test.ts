/**
 * Live check that `StateService.GetCoinInfo` serves metadata for the coins this
 * SDK asks about.
 *
 * The decimals source moved from the JSON-RPC `suix_getCoinMetadata` to gRPC,
 * and a missing answer is not loud: `resolveSuiCoinDecimals` substitutes
 * {@link LBTC_DECIMALS} for LBTC. If the new source started answering empty
 * where the old one did not, amounts would keep working out for LBTC and
 * nothing would say the number stopped coming from the chain. So every LBTC
 * deployment the config carries, plus SUI, is asserted against the node.
 *
 * Talks to public nodes, so it runs under
 * `yarn workspace @lombard.finance/sdk-sui test:live`.
 */
import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import { getConfig, LBTC_DECIMALS, SUI_COINTYPE } from '../../const';
import { createSuiGrpcClient, type SuiNetwork } from '../createSuiGrpcClient';
import {
  getSuiCoinDecimals,
  resolveSuiCoinDecimals,
} from '../getSuiCoinDecimals';

/** SUI publishes its metadata on every network. */
const SUI_DECIMALS = 9;

interface ICoinUnderTest {
  network: SuiNetwork;
  label: string;
  coinType: string;
  decimals: number;
}

/** Every coin the SDK reads decimals for, on the network it lives on. */
const COINS: ICoinUnderTest[] = [
  {
    network: 'mainnet',
    label: 'SUI',
    coinType: SUI_COINTYPE,
    decimals: SUI_DECIMALS,
  },
  {
    network: 'testnet',
    label: 'SUI',
    coinType: SUI_COINTYPE,
    decimals: SUI_DECIMALS,
  },
  {
    network: 'mainnet',
    label: 'LBTC (prod)',
    coinType: getConfig(Env.prod).LBTC,
    decimals: LBTC_DECIMALS,
  },
  {
    network: 'testnet',
    label: 'LBTC (testnet)',
    coinType: getConfig(Env.testnet).LBTC,
    decimals: LBTC_DECIMALS,
  },
  {
    network: 'testnet',
    label: 'LBTC (stage)',
    coinType: getConfig(Env.stage).LBTC,
    decimals: LBTC_DECIMALS,
  },
];

const clientFor = (network: SuiNetwork) =>
  createSuiGrpcClient(network, { timeoutMs: 15_000 });

describe.each(COINS)(
  'GetCoinInfo for $label on $network',
  ({ network, coinType, decimals }) => {
    it('serves the decimals rather than leaving them to the fallback', async () => {
      const served = await getSuiCoinDecimals(clientFor(network), coinType);

      expect(
        served,
        `${coinType} has no CoinMetadata on ${network}, so decimals would come from the ${LBTC_DECIMALS}-decimal fallback instead of the chain`,
      ).toBe(decimals);
    }, 60_000);
  },
);

describe('GetCoinInfo for a coin that is not deployed', () => {
  it('reads as absent rather than as a node failure', async () => {
    // The stage deployment only exists on testnet, so asking mainnet for it is
    // the one case that exercises the missing-metadata branch live: it has to
    // come back as absence, not as an error, or the fallback would never be
    // reached for a deployment that really publishes nothing.
    const notOnMainnet = getConfig(Env.stage).LBTC;

    expect(
      await getSuiCoinDecimals(clientFor('mainnet'), notOnMainnet),
    ).toBeUndefined();

    // Still an LBTC type, so the fallback covers it.
    expect(
      await resolveSuiCoinDecimals(clientFor('mainnet'), notOnMainnet),
    ).toBe(LBTC_DECIMALS);
  }, 60_000);
});
