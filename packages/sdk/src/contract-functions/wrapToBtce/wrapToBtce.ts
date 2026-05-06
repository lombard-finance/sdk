import BigNumber from 'bignumber.js';
import { Address, Hash, isAddress } from 'viem';

import { makePublicClient } from '../../clients/public-client';
import { makeWalletClient } from '../../clients/wallet-client';
import { CHAIN_ID_TO_VIEM_CHAIN_MAP } from '../../common/chains';
import { CommonWriteParameters } from '../../common/parameters';
import { toBaseDenomination } from '../../tokens/tokens';
import { getErrorMessage } from '../../utils/err';
import toBigInt from '../../utils/numbers';
import {
  BTCE_VAULT,
  BTCE_VAULT_DECIMALS,
  isBtceVaultChain,
} from '../../vaults/lib/config';

export type WrapToBtceParameters = {
  /** Address of the deposit token (e.g. LBTCv vault address, LBTC, wBTC). */
  tokenAddress: Address;
  /** Amount to wrap, in the deposit token's natural decimal units. */
  amount: BigNumber.Value;
  /** Decimals of the deposit token. */
  tokenDecimals: number;
  /** Receiver of the BTCe shares. Defaults to `account`. */
  receiver?: Address;
  /** Minimum BTCe shares to mint (slippage protection, in BTCe units). Defaults to 0. */
  minimumMint?: BigNumber.Value;
} & CommonWriteParameters;

/**
 * Wraps a supported deposit asset into BTCe shares via the wrapper's
 * multi-asset `deposit(token, assets, receiver, minShareAmount)` overload.
 *
 * Mirrors the lombard-app's `depositToWrapper` action 1:1: caller is
 * responsible for approving `tokenAddress` to the BTCe contract before
 * calling this. The SDK exposes `approveToken` for that.
 *
 * Returns the deposit transaction hash. Combine with `approveToken` and,
 * for a full BTC→BTCe flow, the existing stake/mint helpers.
 *
 * @returns {Promise<Hash>} The deposit transaction hash.
 */
export async function wrapToBtce({
  tokenAddress,
  amount: amountRaw,
  tokenDecimals,
  receiver,
  minimumMint = 0,
  account,
  chainId,
  provider,
  rpcUrl,
}: WrapToBtceParameters): Promise<Hash> {
  if (!isAddress(tokenAddress, { strict: false })) {
    throw new Error(`Invalid token address: ${tokenAddress}`);
  }

  if (!isBtceVaultChain(chainId)) {
    throw new Error(
      `BTCe is not supported on chain ${chainId}. Supported chains: ${BTCE_VAULT.chains.join(', ')}.`,
    );
  }

  const amount = BigNumber(amountRaw);
  if (!amount.isGreaterThan(0)) {
    throw new Error(
      `Wrap amount must be greater than zero. Received: ${amount.toFixed()}.`,
    );
  }

  const amountBase = toBigInt(toBaseDenomination(amount, tokenDecimals));
  const minMintBase = toBigInt(
    toBaseDenomination(BigNumber(minimumMint), BTCE_VAULT_DECIMALS),
  );

  const publicClient = makePublicClient({ chainId, rpcUrl });
  const walletClient = makeWalletClient({ provider, chainId });

  try {
    const { request } = await publicClient.simulateContract({
      account,
      chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
      abi: BTCE_VAULT.abi,
      address: BTCE_VAULT.contracts[chainId],
      functionName: 'deposit',
      args: [
        tokenAddress,
        amountBase,
        receiver ?? account,
        minMintBase,
      ],
    });

    return await walletClient.writeContract(request);
  } catch (err) {
    // Preserve the original message so callers can detect specific revert reasons
    const msg = getErrorMessage(err);
    throw new Error(msg);
  }
}

