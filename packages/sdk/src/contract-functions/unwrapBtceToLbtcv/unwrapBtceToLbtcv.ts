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

export type UnwrapBtceToLbtcvParameters = {
  /** Amount of LBTCv to receive (in BTC natural units, 8 decimals). */
  amount: BigNumber.Value;
  /** Receiver of the unwrapped LBTCv. Defaults to `account`. */
  receiver?: Address;
  /** Owner of the BTCe shares being burned. Defaults to `account`. */
  owner?: Address;
} & CommonWriteParameters;

/**
 * Unwraps BTCe back into LBTCv via the wrapper's
 * `withdraw(assets, receiver, owner)` ERC4626 entry point.
 *
 * Mirrors lombard-app's `withdrawFromWrapper` 1:1: amount is denominated in
 * LBTCv (the asset, not the share), and the call is gated by the wrapper's
 * `maxWithdraw(owner)`. We throw if the requested amount exceeds maxWithdraw
 * rather than silently capping, so callers see a clear failure they can
 * react to. To get LBTC out of LBTCv afterwards, follow up with
 * `queueWithdraw` from the SDK.
 *
 * @returns {Promise<Hash>} The withdraw transaction hash.
 */
export async function unwrapBtceToLbtcv({
  amount: amountRaw,
  receiver,
  owner,
  account,
  chainId,
  provider,
  rpcUrl,
}: UnwrapBtceToLbtcvParameters): Promise<Hash> {
  if (!isBtceVaultChain(chainId)) {
    throw new Error(
      `BTCe is not supported on chain ${chainId}. Supported chains: ${BTCE_VAULT.chains.join(', ')}.`,
    );
  }

  if (receiver !== undefined && !isAddress(receiver, { strict: false })) {
    throw new Error(`Invalid receiver address: ${receiver}`);
  }

  if (owner !== undefined && !isAddress(owner, { strict: false })) {
    throw new Error(`Invalid owner address: ${owner}`);
  }

  const amount = BigNumber(amountRaw);
  if (!amount.isGreaterThan(0)) {
    throw new Error(
      `Unwrap amount must be greater than zero. Received: ${amount.toFixed()}.`,
    );
  }

  const resolvedReceiver = receiver ?? account;
  const resolvedOwner = owner ?? account;

  const publicClient = makePublicClient({ chainId, rpcUrl });
  const walletClient = makeWalletClient({ provider, chainId });

  const amountBase = toBigInt(toBaseDenomination(amount, BTCE_VAULT_DECIMALS));

  const maxWithdrawRaw = (await publicClient.readContract({
    abi: BTCE_VAULT.abi,
    address: BTCE_VAULT.contracts[chainId],
    functionName: 'maxWithdraw',
    args: [resolvedOwner],
  })) as bigint;

  if (amountBase > maxWithdrawRaw) {
    throw new Error(
      `Unwrap amount ${amount.toFixed()} exceeds maxWithdraw ${BigNumber(
        maxWithdrawRaw.toString(),
      )
        .shiftedBy(-BTCE_VAULT_DECIMALS)
        .toFixed()} for owner ${resolvedOwner}.`,
    );
  }

  try {
    const { request } = await publicClient.simulateContract({
      account,
      chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
      abi: BTCE_VAULT.abi,
      address: BTCE_VAULT.contracts[chainId],
      functionName: 'withdraw',
      args: [amountBase, resolvedReceiver, resolvedOwner],
    });

    return await walletClient.writeContract(request);
  } catch (err) {
    throw new Error(getErrorMessage(err));
  }
}
