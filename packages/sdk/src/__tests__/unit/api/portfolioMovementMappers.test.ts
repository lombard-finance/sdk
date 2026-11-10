/**
 * The address and block time forms the v2 portfolio mappers return, and the
 * minted amount a deposit reports.
 *
 * `/v2/portfolio/{address}/withdrawals` can send an EVM destination as a
 * 32-byte word, the 20-byte address left-padded with zeros. The mappers return
 * EVM addresses as the v1 readers did, 20 bytes and EIP-55 checksummed, and
 * leave every other chain's address as it came: Starknet and Sui addresses are
 * 32-byte values that may start with zeros themselves.
 *
 * A BTC.b deposit's LBTC leg can carry the BTC.b amount itself. v1 never set
 * `tokenAmount` for these deposits, so that echo is not reported as minted.
 */
import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import {
  mapMovementToBridge,
  mapMovementToDeposit,
  mapMovementToUnstake,
  type MovementLeg,
  toEpochSeconds,
  toEvmAddress,
} from '../../../api-functions/getPortfolioMovements/movements';
import { ChainId } from '../../../common/chains';

const ENV = Env.stage;

const ADDRESS = '0x659579f1460c38c3ce3288b47b074646cef855fc';
const CHECKSUMMED = '0x659579F1460c38C3ce3288b47b074646CEF855fc';
/** {@link ADDRESS} as `/withdrawals` sends it: left-padded to 32 bytes. */
const PADDED =
  '0x000000000000000000000000659579f1460c38c3ce3288b47b074646cef855fc';

const SEPOLIA_LEG: MovementLeg = {
  chain: 'ethereum_sepolia',
  address: ADDRESS,
  amount: '100000',
  asset: { decimals: 8, asset_type: 'lbtc' },
  transaction_id: '0xburn',
  block_time: '2026-11-02T12:00:00Z',
};

const BTC_LEG: MovementLeg = {
  chain: 'bitcoin_signet',
  address: 'tb1qpayout',
  amount: '99000',
  asset: { decimals: 8 },
};

describe('toEvmAddress', () => {
  it('reduces a zero-padded 32-byte word to the checksummed address', () => {
    expect(toEvmAddress(PADDED)).toBe(CHECKSUMMED);
  });

  it('checksums a 20-byte address, whatever its case', () => {
    expect(toEvmAddress(ADDRESS)).toBe(CHECKSUMMED);
    expect(toEvmAddress(ADDRESS.toUpperCase().replace('0X', '0x'))).toBe(
      CHECKSUMMED,
    );
    expect(toEvmAddress(CHECKSUMMED)).toBe(CHECKSUMMED);
  });

  it.each([
    [
      'a 32-byte value that is not zero-padded',
      '0x0000000000000000000000ff659579f1460c38c3ce3288b47b074646cef855fc',
    ],
    ['an odd length', '0x659579f1460c38c3ce3288b47b074646cef855f'],
    ['a non-hex digit', '0x659579f1460c38c3ce3288b47b074646cef855fg'],
    ['an upper-case prefix', '0X659579f1460c38c3ce3288b47b074646cef855fc'],
    ['no prefix', '659579f1460c38c3ce3288b47b074646cef855fc'],
    ['an empty string', ''],
  ])('passes %s through unchanged', (_, value) => {
    expect(toEvmAddress(value)).toBe(value);
  });
});

describe('addresses in the mapped movements', () => {
  it('reduces a padded redeem_lbtc destination on Sepolia to the checksummed address', () => {
    const unstake = mapMovementToUnstake(
      {
        type: 'redeem_lbtc',
        status: 'completed',
        source: SEPOLIA_LEG,
        destination: {
          chain: 'ethereum_sepolia',
          address: PADDED,
          asset: { decimals: 8, asset_type: 'btcb' },
          transaction_id: '0xclaim',
        },
      },
      ENV,
    );

    expect(unstake).toMatchObject({
      isNative: true,
      fromChainId: ChainId.sepolia,
      toChainId: ChainId.sepolia,
      fromAddress: CHECKSUMMED,
      toAddress: CHECKSUMMED,
    });
  });

  it('checksums a plain lower-case EVM address on every EVM leg', () => {
    const deposit = mapMovementToDeposit(
      {
        type: 'deposit_btcb',
        status: 'pending',
        source: { ...SEPOLIA_LEG, chain: 'base_sepolia' },
        destination: SEPOLIA_LEG,
      },
      ENV,
    );
    expect(deposit.fromAddress).toBe(CHECKSUMMED);
    expect(deposit.toAddress).toBe(CHECKSUMMED);

    const bridge = mapMovementToBridge(
      {
        type: 'bridge',
        status: 'completed',
        source: SEPOLIA_LEG,
        destination: { ...SEPOLIA_LEG, chain: 'base_sepolia', address: PADDED },
      },
      ENV,
    );
    expect(bridge.fromAddress).toBe(CHECKSUMMED);
    expect(bridge.toAddress).toBe(CHECKSUMMED);
  });

  it('normalises a chain resolved from the gateway chain list', () => {
    const bridge = mapMovementToBridge(
      {
        type: 'bridge',
        source: SEPOLIA_LEG,
        destination: { chain: 'berachain_bartio', address: PADDED },
      },
      ENV,
      new Map([['berachain', '80094']]),
    );

    expect(bridge.toChainId).toBe(80094);
    expect(bridge.toAddress).toBe(CHECKSUMMED);
  });

  it('leaves a Starknet destination with leading zeros untouched', () => {
    const deposit = mapMovementToDeposit(
      {
        type: 'deposit_native',
        status: 'pending',
        source: { ...BTC_LEG, address: 'tb1qdeposit' },
        destination: { chain: 'starknet_sepolia', address: PADDED },
      },
      ENV,
    );

    expect(deposit.depositAddress).toBe('tb1qdeposit');
    expect(deposit.toAddress).toBe(PADDED);
  });

  it('leaves a Sui destination with leading zeros untouched', () => {
    const bridge = mapMovementToBridge(
      {
        type: 'bridge',
        source: SEPOLIA_LEG,
        destination: { chain: 'sui_testnet', address: PADDED },
      },
      ENV,
    );

    expect(bridge.fromAddress).toBe(CHECKSUMMED);
    expect(bridge.toAddress).toBe(PADDED);
  });

  it('leaves a Bitcoin payout address untouched', () => {
    const unstake = mapMovementToUnstake(
      {
        type: 'redeem_native',
        status: 'pending',
        source: SEPOLIA_LEG,
        destination: BTC_LEG,
      },
      ENV,
    );

    expect(unstake.fromAddress).toBe(CHECKSUMMED);
    expect(unstake.toAddress).toBe('tb1qpayout');
  });

  it('leaves a leg whose chain did not resolve untouched', () => {
    const bridge = mapMovementToBridge(
      {
        type: 'bridge',
        source: SEPOLIA_LEG,
        destination: { chain: 'mantle', address: PADDED },
      },
      ENV,
    );

    expect(bridge.toChainId).toBeUndefined();
    expect(bridge.toAddress).toBe(PADDED);
  });

  it('passes a malformed value on an EVM leg through without throwing', () => {
    const malformed = '0x659579f1460c38c3ce3288b47b074646cef855f';
    const unstake = mapMovementToUnstake(
      {
        type: 'redeem_lbtc',
        source: { ...SEPOLIA_LEG, address: undefined },
        destination: { chain: 'ethereum_sepolia', address: malformed },
      },
      ENV,
    );

    expect(unstake.fromAddress).toBe('');
    expect(unstake.toAddress).toBe(malformed);
  });
});

describe('block times in the mapped movements', () => {
  /** 2026-11-02T12:00:00Z */
  const SECONDS = 1793620800;

  const bridgeAt = (block_time: unknown) =>
    mapMovementToBridge(
      {
        type: 'bridge',
        source: {
          ...SEPOLIA_LEG,
          block_time: block_time as MovementLeg['block_time'],
        },
        destination: { ...SEPOLIA_LEG, chain: 'base_sepolia' },
      },
      ENV,
    ).blockTime;

  it.each([
    ['ISO 8601', '2026-11-02T12:00:00Z'],
    ['epoch seconds as a string', String(SECONDS)],
    ['epoch seconds as a number', SECONDS],
    ['epoch milliseconds as a number', SECONDS * 1000],
    ['epoch milliseconds as a string', String(SECONDS * 1000)],
  ])('reads %s as Unix seconds', (_, value) => {
    expect(bridgeAt(value)).toBe(SECONDS);
  });

  it.each([
    ['garbage', 'yesterday'],
    ['an empty string', ''],
    ['a negative number', -1],
    ['NaN', Number.NaN],
    ['null', null],
    ['missing', undefined],
  ])('drops %s', (_, value) => {
    expect(bridgeAt(value)).toBeUndefined();
  });

  it('applies the same reading to deposits and withdrawals', () => {
    const deposit = mapMovementToDeposit(
      {
        type: 'deposit_native',
        source: { ...BTC_LEG, block_time: String(SECONDS) },
        destination: SEPOLIA_LEG,
      },
      ENV,
    );
    expect(deposit.blockTime).toBe(SECONDS);

    const unstake = mapMovementToUnstake(
      {
        type: 'redeem_native',
        source: { ...SEPOLIA_LEG, block_time: SECONDS },
        destination: BTC_LEG,
      },
      ENV,
    );
    expect(unstake.blockTime).toBe(SECONDS);

    const undated = mapMovementToUnstake(
      {
        type: 'redeem_native',
        source: { ...SEPOLIA_LEG, block_time: 'not a time' },
        destination: BTC_LEG,
      },
      ENV,
    );
    expect(undated.blockTime).toBe(0);
  });

  it('keeps fractional seconds out of the result', () => {
    expect(toEpochSeconds('1793620800.75')).toBe(SECONDS);
    expect(toEpochSeconds(' 1793620800 ')).toBe(SECONDS);
  });
});

describe('tokenAmount on deposits', () => {
  const BTCB_LEG: MovementLeg = {
    chain: 'base_sepolia',
    address: ADDRESS,
    amount: '100000',
    asset: { decimals: 8, asset_type: 'btcb' },
    transaction_id: '0xdeposit',
  };

  it('leaves it unset when a BTC.b deposit echoes the source amount', () => {
    const deposit = mapMovementToDeposit(
      {
        type: 'deposit_btcb',
        status: 'completed',
        source: BTCB_LEG,
        destination: { ...SEPOLIA_LEG, amount: '100000' },
      },
      ENV,
    );

    expect(deposit.isNative).toBe(true);
    expect(deposit.amount.toString()).toBe('0.001');
    expect(deposit.tokenAmount).toBeUndefined();
  });

  it('keeps a BTC.b deposit amount that differs from the source', () => {
    const deposit = mapMovementToDeposit(
      {
        type: 'deposit_btcb',
        status: 'completed',
        source: BTCB_LEG,
        destination: { ...SEPOLIA_LEG, amount: '99500' },
      },
      ENV,
    );

    expect(deposit.isNative).toBe(true);
    expect(deposit.tokenAmount?.toString()).toBe('0.000995');
  });

  it('keeps a BTC deposit amount even when it equals the source', () => {
    const deposit = mapMovementToDeposit(
      {
        type: 'deposit_native',
        status: 'completed',
        source: { ...BTC_LEG, amount: '100000' },
        destination: { ...SEPOLIA_LEG, amount: '100000' },
      },
      ENV,
    );

    expect(deposit.isNative).toBe(false);
    expect(deposit.tokenAmount?.toString()).toBe('0.001');
  });
});
