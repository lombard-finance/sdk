/**
 * Fee authorization on Ethereum and Sepolia.
 *
 * The approval on file is reported with its expiry in Unix seconds. Read as a
 * date string it never parses, so a valid approval looked expired and was
 * signed again on every write, and the store that followed was refused as a
 * duplicate.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  getNetworkFeeSignature: vi.fn(),
  storeNetworkFeeSignature: vi.fn(),
  getLBTCMintingFee: vi.fn(),
  signNetworkFee: vi.fn(),
  requiresAutoMintFee: vi.fn(),
}));

vi.mock('@lombard.finance/sdk', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...sdk,
}));

import { LombardActionProvider } from '../lombardActionProvider';

const ACCOUNT = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18';

/** The private step under test, reached the way the write actions reach it. */
function ensureFeeAuthorization() {
  return (
    new LombardActionProvider() as unknown as {
      ensureFeeAuthorization: (...args: unknown[]) => Promise<void>;
    }
  ).ensureFeeAuthorization({}, 11155111, 'testnet', ACCOUNT, {});
}

/** An approval on file lapsing `hours` from now, as the SDK reports it. */
function onFile(hours: number) {
  sdk.getNetworkFeeSignature.mockResolvedValue({
    hasSignature: true,
    expirationDate: String(Math.floor(Date.now() / 1000) + hours * 3600),
    isDelayed: false,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  sdk.requiresAutoMintFee.mockReturnValue(true);
  sdk.getLBTCMintingFee.mockResolvedValue('1000');
  sdk.signNetworkFee.mockResolvedValue({
    signature: '0xfee',
    typedData: '{"message":{"chainId":11155111}}',
  });
  sdk.storeNetworkFeeSignature.mockResolvedValue('success');
});

describe('fee authorization', () => {
  it('reuses an approval that is in force', async () => {
    onFile(24);

    await ensureFeeAuthorization();

    expect(sdk.signNetworkFee).not.toHaveBeenCalled();
    expect(sdk.storeNetworkFeeSignature).not.toHaveBeenCalled();
  });

  it('signs a new approval when the one on file has lapsed', async () => {
    onFile(-1);

    await ensureFeeAuthorization();

    expect(sdk.signNetworkFee).toHaveBeenCalledOnce();
    expect(sdk.storeNetworkFeeSignature).toHaveBeenCalledOnce();
  });

  // Inside the hour's margin the approval could lapse before the mint.
  it('signs a new approval when the one on file lapses within the hour', async () => {
    onFile(0.5);

    await ensureFeeAuthorization();

    expect(sdk.signNetworkFee).toHaveBeenCalledOnce();
  });

  it('looks nothing up on a chain without a fee approval', async () => {
    sdk.requiresAutoMintFee.mockReturnValue(false);

    await ensureFeeAuthorization();

    expect(sdk.getNetworkFeeSignature).not.toHaveBeenCalled();
  });
});
