import BigNumber from 'bignumber.js';
import { Address, erc20Abi, Hash } from 'viem';

import { makePublicClient } from '../../clients/public-client';
import { makeWalletClient } from '../../clients/wallet-client';
import { CHAIN_ID_TO_VIEM_CHAIN_MAP } from '../../common/chains';
import { CommonWriteParameters } from '../../common/parameters';
import { Token } from '../../tokens/token-addresses';
import { getTokenInfo, toBaseDenomination } from '../../tokens/tokens';
import { getErrorMessage } from '../../utils/err';
import toBigInt from '../../utils/numbers';
import { BTCE_VAULT, isBtceVaultChain } from '../../vaults/lib/config';
import { wrapToBtce } from '../wrapToBtce/wrapToBtce';

export type DepositEarnParameters = {
  /** The deposit token (e.g. Token.LBTC, Token.wBTC). Defaults to Token.LBTC. */
  token?: Token;
  /** Amount to deposit, in the token's natural decimal units. */
  amount: BigNumber.Value;
  /** Receiver of the BTCe shares. Defaults to `account`. */
  receiver?: Address;
  /** Minimum BTCe shares to mint (slippage protection, in BTCe units). Defaults to 0. */
  minimumMint?: BigNumber.Value;
  /**
   * Whether to send an approval transaction when allowance is insufficient.
   * If `false` and allowance is insufficient, throws instead of approving.
   * @default true
   */
  approve?: boolean;
} & CommonWriteParameters;

/**
 * Deposits a supported asset (LBTC, wBTC, etc.) into the BTCe wrapper vault.
 *
 * High-level Earn-native deposit: handles the ERC20 approval to the BTCe
 * contract (when needed) and then calls `wrapToBtce` to mint BTCe shares to
 * the receiver. Returns the wrap transaction hash; the approval hash, if any,
 * is awaited internally for receipt before proceeding.
 *
 * Token addresses and decimals are resolved internally via the SDK's token
 * catalog, so callers pass the same `Token` enum used by the legacy `deposit`
 * function.
 *
 * @returns {Promise<Hash>} The wrap transaction hash.
 */
export async function depositEarn({
  token = Token.LBTC,
  amount: amountRaw,
  receiver,
  minimumMint = 0,
  approve = true,
  account,
  chainId,
  provider,
  rpcUrl,
  env,
}: DepositEarnParameters): Promise<Hash> {
  if (!isBtceVaultChain(chainId)) {
    throw new Error(
      `BTCe is not supported on chain ${chainId}. Supported chains: ${BTCE_VAULT.chains.join(', ')}.`,
    );
  }

  const amount = BigNumber(amountRaw);
  if (!amount.isGreaterThan(0)) {
    throw new Error(
      `Deposit amount must be greater than zero. Received: ${amount.toFixed()}.`,
    );
  }

  const tokenInfo = await getTokenInfo(token, chainId, env, rpcUrl);
  if (!tokenInfo) {
    throw new Error(
      `Could not resolve token info for ${token} on chain ${chainId}.`,
    );
  }

  const publicClient = makePublicClient({ chainId, rpcUrl });
  const walletClient = makeWalletClient({ provider, chainId });

  const btceAddress = BTCE_VAULT.contracts[chainId];
  const amountBase = toBigInt(toBaseDenomination(amount, tokenInfo.decimals));

  const allowanceRaw = (await publicClient.readContract({
    address: tokenInfo.address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [account, btceAddress],
  })) as bigint;

  if (allowanceRaw < amountBase) {
    if (!approve) {
      throw new Error(
        `Deposit amount ${amount.toFixed()} exceeds allowance for ${token} -> BTCe. Re-run with approve: true or pre-approve the BTCe contract.`,
      );
    }

    try {
      const { request } = await publicClient.simulateContract({
        account,
        chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
        address: tokenInfo.address,
        abi: erc20Abi,
        functionName: 'approve',
        args: [btceAddress, amountBase],
      });
      const approveHash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
    } catch (err) {
      throw new Error(
        `Approval of ${token} for BTCe failed: ${getErrorMessage(err)}`,
      );
    }
  }

  return wrapToBtce({
    tokenAddress: tokenInfo.address,
    amount,
    tokenDecimals: tokenInfo.decimals,
    receiver,
    minimumMint,
    account,
    chainId,
    provider,
    rpcUrl,
    env,
  });
}
