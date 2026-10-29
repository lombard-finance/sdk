/**
 * Tests for getBasculeDepositStatus.
 *
 * Focus: Verify correct bascule getter selection per token/chain.
 */

import {
  encodeAbiParameters,
  encodeFunctionData,
  pad,
  zeroAddress,
} from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../common/chains';
import { AddressKind, Token } from '../../../tokens/token-addresses';
import {
  BasculeDepositStatus,
  getBasculeDepositStatus,
  LegacyPayloadNotClaimableError,
} from '../getBasculeDepositStatus';

const readContractMock = vi.fn();
const callMock = vi.fn();
const getTokenContractInfoMock = vi.fn();
const isUpgradedAbiMock = vi.fn();

vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn(() => ({
    readContract: (...args: unknown[]) => readContractMock(...args),
    call: (...args: unknown[]) => callMock(...args),
  })),
}));

vi.mock('../../../tokens/tokens', () => ({
  getTokenContractInfo: (...args: unknown[]) =>
    getTokenContractInfoMock(...args),
  isUpgradedAbi: (...args: unknown[]) => isUpgradedAbiMock(...args),
}));

describe('getBasculeDepositStatus', () => {
  beforeEach(() => {
    readContractMock.mockReset();
    callMock.mockReset();
    getTokenContractInfoMock.mockReset();
    isUpgradedAbiMock.mockReset();
  });

  it('uses getBascule() for BTCb on Avalanche', async () => {
    getTokenContractInfoMock.mockResolvedValue({
      address: '0xAdapterAddress',
      abi: [{ type: 'function', name: 'getBascule', inputs: [], outputs: [] }],
      chainId: ChainId.avalancheFuji,
      addressKind: AddressKind.Adapter,
    });
    isUpgradedAbiMock.mockReturnValue(false);
    readContractMock.mockResolvedValue(zeroAddress);

    const status = await getBasculeDepositStatus({
      chainId: ChainId.avalancheFuji,
      rawPayload: '0x1234',
      token: Token.BTCb,
    });

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
      addressKind: AddressKind.Adapter,
    });
    isUpgradedAbiMock.mockReturnValue(false);
    readContractMock.mockResolvedValue(zeroAddress);

    const status = await getBasculeDepositStatus({
      chainId: ChainId.ethereum,
      rawPayload: '0x5678',
      token: Token.LBTC,
    });

    expect(status).toBe(BasculeDepositStatus.REPORTED);
    expect(readContractMock).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'Bascule' }),
    );
  });

  describe('Asset Router (GMPBascule) chains', () => {
    const ASSET_ROUTER = '0x9eCe5fB1aB62d9075c4ec814b321e24D8EA021ac';
    const BASCULE = '0x9f1831B79CAbaA0fb0091f607e4845f3D2eedA4E';

    // MessageV1(bytes32,uint256,bytes32,bytes32,bytes32,bytes) wrapping
    // mint(bytes32,bytes32,uint256), as notarized after the GMP migration.
    const mintBody = encodeFunctionData({
      abi: [
        {
          type: 'function',
          name: 'mint',
          inputs: [
            { name: 'toToken', type: 'bytes32' },
            { name: 'recipient', type: 'bytes32' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [],
          stateMutability: 'nonpayable',
        },
      ],
      functionName: 'mint',
      args: [pad('0x01'), pad('0x02'), 1000n],
    });
    const gmpPayload = encodeFunctionData({
      abi: [
        {
          type: 'function',
          name: 'MessageV1',
          inputs: [
            { name: 'msgPath', type: 'bytes32' },
            { name: 'msgNonce', type: 'uint256' },
            { name: 'msgSender', type: 'bytes32' },
            { name: 'msgRecipient', type: 'bytes32' },
            { name: 'msgDestinationCaller', type: 'bytes32' },
            { name: 'msgBody', type: 'bytes' },
          ],
          outputs: [],
          stateMutability: 'nonpayable',
        },
      ],
      functionName: 'MessageV1',
      args: [pad('0x03'), 7n, pad('0x04'), pad('0x05'), pad('0x00'), mintBody],
    });

    beforeEach(() => {
      getTokenContractInfoMock.mockResolvedValue({
        address: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
        abi: [],
        chainId: ChainId.base,
        addressKind: AddressKind.Adapter,
      });
      isUpgradedAbiMock.mockReturnValue(true);
      readContractMock.mockImplementation(
        ({ functionName }: { functionName: string }) =>
          functionName === 'getAssetRouter' ? ASSET_ROUTER : BASCULE,
      );
    });

    it('reads the status from a GMPBasculeV2 (uint8 only) on Base', async () => {
      callMock.mockResolvedValue({
        data: encodeAbiParameters([{ type: 'uint8' }], [1]),
      });

      const status = await getBasculeDepositStatus({
        chainId: ChainId.base,
        rawPayload: gmpPayload,
      });

      expect(status).toBe(BasculeDepositStatus.REPORTED);
      expect(callMock).toHaveBeenCalledWith(
        expect.objectContaining({ to: BASCULE }),
      );
      expect(readContractMock).not.toHaveBeenCalledWith(
        expect.objectContaining({ functionName: 'depositHistory' }),
      );
    });

    it('reads the status from a GMPBasculeV1 (message + status) on Avalanche', async () => {
      callMock.mockResolvedValue({
        data: encodeAbiParameters(
          [
            {
              type: 'tuple',
              components: [
                { type: 'uint256' },
                { type: 'address' },
                { type: 'address' },
                { type: 'uint256' },
              ],
            },
            { type: 'uint8' },
          ],
          [[7n, zeroAddress, zeroAddress, 1000n], 2],
        ),
      });

      const status = await getBasculeDepositStatus({
        chainId: ChainId.avalanche,
        rawPayload: gmpPayload.slice(2),
      });

      expect(status).toBe(BasculeDepositStatus.WITHDRAWN);
    });

    it('refuses a legacy payload without calling the Bascule', async () => {
      await expect(
        getBasculeDepositStatus({
          chainId: ChainId.base,
          rawPayload: '0xf2e73f7c' + '00'.repeat(160),
        }),
      ).rejects.toBeInstanceOf(LegacyPayloadNotClaimableError);
      expect(callMock).not.toHaveBeenCalled();
    });
  });
});
