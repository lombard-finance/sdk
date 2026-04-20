import { address } from 'bitcoinjs-lib';

export enum BtcAddressType {
  p2tr = 'p2tr',
  p2wpkh = 'p2wpkh',
  p2wsh = 'p2wsh',
}

export function getBtcAddressType(btcAddress: string): BtcAddressType {
  const { data, version } = address.fromBech32(btcAddress);

  if (version === 0) {
    if (data.length === 20) return BtcAddressType.p2wpkh;
    if (data.length === 32) return BtcAddressType.p2wsh;
  }

  if (version === 1) {
    if (data.length === 32) return BtcAddressType.p2tr;
  }

  throw new Error('Invalid BTC address');
}
