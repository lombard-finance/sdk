import { describe, expect, it, vi } from 'vitest';

import { SolanaServiceImpl } from './SolanaServiceImpl';

vi.mock('../web3Sdk/signLbtcDestinationAddrSolana', () => ({
  signLbtcDestinationAddrSolana: vi
    .fn()
    .mockResolvedValue({ signature: 'mock-sig' }),
}));

vi.mock('../web3Sdk/redeemToken/redeemForBtc', () => ({
  redeemForBtc: vi.fn().mockResolvedValue('mock-redeemForBtc-tx'),
}));

vi.mock('../web3Sdk/redeem/redeem', () => ({
  redeem: vi.fn().mockResolvedValue('mock-redeem-tx'),
}));

vi.mock('../web3Sdk/deposit/deposit', () => ({
  deposit: vi.fn().mockResolvedValue('mock-deposit-tx'),
}));

const { signLbtcDestinationAddrSolana } =
  await import('../web3Sdk/signLbtcDestinationAddrSolana');
const { redeemForBtc } = await import('../web3Sdk/redeemToken/redeemForBtc');
const { redeem } = await import('../web3Sdk/redeem/redeem');
const { deposit } = await import('../web3Sdk/deposit/deposit');

const mockProvider = { publicKey: 'mock-pubkey' };
const getProvider = vi.fn().mockResolvedValue(mockProvider);

describe('SolanaServiceImpl', () => {
  it('should resolve provider for each call', async () => {
    const service = new SolanaServiceImpl(getProvider);

    await service.signLbtcDestination({ network: 'devnet' });

    expect(getProvider).toHaveBeenCalled();
  });

  describe('signLbtcDestination', () => {
    it('should delegate to signLbtcDestinationAddrSolana', async () => {
      const service = new SolanaServiceImpl(getProvider);

      const result = await service.signLbtcDestination({ network: 'devnet' });

      expect(signLbtcDestinationAddrSolana).toHaveBeenCalledWith({
        provider: mockProvider,
        network: 'devnet',
      });
      expect(result).toEqual({ signature: 'mock-sig' });
    });
  });

  describe('redeemForBtc', () => {
    it('should delegate to redeemForBtc and return signature', async () => {
      const service = new SolanaServiceImpl(getProvider);

      const result = await service.redeemForBtc({
        amount: '2000',
        btcAddress: 'bc1q...',
        network: 'devnet',
        env: 'dev',
        tokenMint: 'LBTCmint...',
      });

      expect(redeemForBtc).toHaveBeenCalledWith(mockProvider, {
        amount: '2000',
        btcAddress: 'bc1q...',
        network: 'devnet',
        env: 'dev',
        tokenMint: 'LBTCmint...',
      });
      expect(result).toEqual({ signature: 'mock-redeemForBtc-tx' });
    });
  });

  describe('redeem', () => {
    it('should delegate to redeem and return signature', async () => {
      const service = new SolanaServiceImpl(getProvider);

      const result = await service.redeem({
        amount: '3000',
        recipient: '8yarEiDaJVik...',
        network: 'devnet',
        env: 'dev',
      });

      expect(redeem).toHaveBeenCalledWith(mockProvider, {
        amount: '3000',
        recipient: '8yarEiDaJVik...',
        network: 'devnet',
        env: 'dev',
        tokenMint: undefined,
        toLchainId: undefined,
        toTokenAddress: undefined,
      });
      expect(result).toEqual({ signature: 'mock-redeem-tx' });
    });
  });

  describe('deposit', () => {
    it('should delegate to deposit and return signature', async () => {
      const service = new SolanaServiceImpl(getProvider);

      const result = await service.deposit({
        amount: '4000',
        recipient: '8yarEiDaJVik...',
        network: 'devnet',
      });

      expect(deposit).toHaveBeenCalledWith(mockProvider, {
        amount: '4000',
        recipient: '8yarEiDaJVik...',
        network: 'devnet',
        env: undefined,
        sourceTokenMint: undefined,
        toLchainId: undefined,
        toTokenAddress: undefined,
      });
      expect(result).toEqual({ signature: 'mock-deposit-tx' });
    });
  });
});
