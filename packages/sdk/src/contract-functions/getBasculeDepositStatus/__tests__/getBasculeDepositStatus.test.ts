/**
 * Tests for getBasculeDepositStatus.
 *
 * Focus: Verify correct bascule getter selection per token/chain.
 */

import { zeroAddress } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../common/chains';
import { AddressKind, Token } from '../../../tokens/token-addresses';
import { BasculeDepositStatus, getBasculeDepositStatus } from '../getBasculeDepositStatus';

const readContractMock = vi.fn();
const getTokenContractInfoMock = vi.fn();
const isUpgradedAbiMock = vi.fn();

vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn(() => ({
    readContract: (...args: unknown[]) => readContractMock(...args) })) }));

vi.mock('../../../tokens/tokens', () => ({
  getTokenContractInfo: (...args: unknown[]) => getTokenContractInfoMock(...args),
  isUpgradedAbi: (...args: unknown[]) => isUpgradedAbiMock(...args) }));

describe('getBasculeDepositStatus', () => {
  beforeEach(() => {
    readContractMock.mockReset();
    getTokenContractInfoMock.mockReset();
    isUpgradedAbiMock.mockReset();
  });

  it('uses getBascule() for BTCb on Avalanche', async () => {
    getTokenContractInfoMock.mockResolvedValue({
      address: '0xAdapterAddress',
      abi: [{ type: 'function', name: 'getBascule', inputs: [], outputs: [] }],
      chainId: ChainId.avalancheFuji,
      addressKind: AddressKind.Adapter });
    isUpgradedAbiMock.mockReturnValue(false);
    readContractMock.mockResolvedValue(zeroAddress);

    const status = await getBasculeDepositStatus({
      chainId: ChainId.avalancheFuji,
      rawPayload: '0x1234',
      token: Token.BTCb });

    expect(status).toBe(BasculeDepositStatus.REPORTED);
    expect(readContractMock).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'getBascule' }),
    );
    expect(readContractMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'Bascule' }),
    );
  });

  it('uses Bascule() for legacy LBTC when not upgraded', async () => {
    getTokenContractInfoMock.mockResolvedValue({
      address: '0xLegacyLbtcAddress',
      abi: [{ type: 'function', name: 'Bascule', inputs: [], outputs: [] }],
      chainId: ChainId.ethereum,
      addressKind: AddressKind.Adapter });
    isUpgradedAbiMock.mockReturnValue(false);
    readContractMock.mockResolvedValue(zeroAddress);

    const status = await getBasculeDepositStatus({
      chainId: ChainId.ethereum,
      rawPayload: '0x5678',
      token: Token.LBTC });

    expect(status).toBe(BasculeDepositStatus.REPORTED);
    expect(readContractMock).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'Bascule' }),
    );
  });
});
