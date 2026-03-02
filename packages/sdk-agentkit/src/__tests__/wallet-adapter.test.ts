/**
 * Tests for wallet adapter
 *
 * Verifies that the EIP-1193 adapter correctly proxies RPC calls
 * to the underlying AgentKit EvmWalletProvider.
 */

import type { EvmWalletProvider } from '@coinbase/agentkit';
import { describe, expect, it, vi } from 'vitest';

import { toEIP1193Provider } from '../utils/wallet-adapter';

function createMockWalletProvider() {
  return {
    getAddress: vi.fn().mockReturnValue('0xabcdef1234567890abcdef1234567890abcdef12'),
    getNetwork: vi.fn().mockReturnValue({
      protocolFamily: 'evm',
      networkId: 'base-mainnet',
      chainId: '8453',
    }),
    getName: vi.fn().mockReturnValue('mock_wallet'),
    getBalance: vi.fn().mockResolvedValue(BigInt(0)),
    nativeTransfer: vi.fn().mockResolvedValue('0xtx'),
    signMessage: vi.fn().mockResolvedValue('0xmsgsig'),
    signTypedData: vi.fn().mockResolvedValue('0xtypedsig'),
    signTransaction: vi.fn().mockResolvedValue('0xsignedtx'),
    sendTransaction: vi.fn().mockResolvedValue('0xtxhash'),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({}),
    readContract: vi.fn().mockResolvedValue(BigInt(0)),
  } as unknown as EvmWalletProvider;
}

describe('toEIP1193Provider', () => {
  it('returns wallet address for eth_accounts', async () => {
    const wp = createMockWalletProvider();
    const provider = toEIP1193Provider(wp);

    const accounts = await provider.request({
      method: 'eth_accounts',
    } as never);
    expect(accounts).toEqual([
      '0xabcdef1234567890abcdef1234567890abcdef12',
    ]);
  });

  it('returns wallet address for eth_requestAccounts', async () => {
    const wp = createMockWalletProvider();
    const provider = toEIP1193Provider(wp);

    const accounts = await provider.request({
      method: 'eth_requestAccounts',
    } as never);
    expect(accounts).toEqual([
      '0xabcdef1234567890abcdef1234567890abcdef12',
    ]);
  });

  it('returns hex chainId for eth_chainId', async () => {
    const wp = createMockWalletProvider();
    const provider = toEIP1193Provider(wp);

    const chainId = await provider.request({
      method: 'eth_chainId',
    } as never);
    expect(chainId).toBe('0x2105'); // 8453 in hex
  });

  it('delegates eth_sendTransaction to walletProvider', async () => {
    const wp = createMockWalletProvider();
    const provider = toEIP1193Provider(wp);

    const tx = { to: '0x1234', value: '0x0' };
    await provider.request({
      method: 'eth_sendTransaction',
      params: [tx],
    } as never);

    expect(wp.sendTransaction).toHaveBeenCalledWith(tx);
  });

  it('delegates personal_sign to signMessage', async () => {
    const wp = createMockWalletProvider();
    const provider = toEIP1193Provider(wp);

    await provider.request({
      method: 'personal_sign',
      params: ['0xdeadbeef', '0xabcdef1234567890abcdef1234567890abcdef12'],
    } as never);

    expect(wp.signMessage).toHaveBeenCalledWith('0xdeadbeef');
  });

  it('delegates eth_signTypedData_v4 and parses JSON string', async () => {
    const wp = createMockWalletProvider();
    const provider = toEIP1193Provider(wp);

    const typedData = { domain: {}, types: {}, message: {} };
    await provider.request({
      method: 'eth_signTypedData_v4',
      params: [
        '0xabcdef1234567890abcdef1234567890abcdef12',
        JSON.stringify(typedData),
      ],
    } as never);

    expect(wp.signTypedData).toHaveBeenCalledWith(typedData);
  });

  it('delegates eth_signTypedData_v4 with object param', async () => {
    const wp = createMockWalletProvider();
    const provider = toEIP1193Provider(wp);

    const typedData = { domain: {}, types: {}, message: {} };
    await provider.request({
      method: 'eth_signTypedData_v4',
      params: [
        '0xabcdef1234567890abcdef1234567890abcdef12',
        typedData,
      ],
    } as never);

    expect(wp.signTypedData).toHaveBeenCalledWith(typedData);
  });
});
