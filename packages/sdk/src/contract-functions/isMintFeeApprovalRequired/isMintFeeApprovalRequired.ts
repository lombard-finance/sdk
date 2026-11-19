import type { Env } from '@lombard.finance/sdk-common';
import { type Address, parseAbi } from 'viem';

import { makePublicClient } from '../../clients/public-client';
import type { ChainId } from '../../common/chains';
import { requiresAutoMintFee } from '../../common/fee-requirements';
import { Token, TOKEN_ADDRESSES } from '../../tokens/token-addresses';

const DEPOSIT_FEE_ABI = parseAbi([
  'function getDepositFee() view returns (uint256)',
]);

/** Tokens whose contract generation can be read from `getDepositFee()`. */
const MINT_FEE_TOKENS: readonly Token[] = [Token.LBTC, Token.BTCb];

export interface IsMintFeeApprovalRequiredParams {
  chainId: ChainId;
  token: Token;
  env: Env;
  rpcUrl?: string;
}

/**
 * The contract that answers for the deposit fee: the adapter where the token
 * is minted through one, otherwise the token itself.
 */
function getDepositFeeContract(
  token: Token,
  chainId: ChainId,
  env: Env,
): Address | undefined {
  const entry = (
    TOKEN_ADDRESSES[token]?.[env] as
      | Partial<Record<ChainId, string | { token: string; adapter: string }>>
      | undefined
  )?.[chainId];
  if (!entry) {
    return undefined;
  }
  return (typeof entry === 'string' ? entry : entry.adapter) as Address;
}

/**
 * Whether a mint of `token` on `chainId` still needs the signed fee approval.
 *
 * Only the chains in `AUTO_MINT_FEE_CHAINS` ever ask for it, and there only
 * the older token contracts do: they mint with a commission the user approves
 * by signature. The newer contracts take a deposit fee inside the mint and
 * expose `getDepositFee()`; for them no approval is needed. Which one a chain
 * runs is read from the contract, so each chain and environment moves over
 * when its contracts are upgraded, without an SDK change.
 *
 * Any failed read keeps the approval. A bare revert is the older contract,
 * and for any other failure the approval is the safe side: the newer
 * contracts accept it, while skipping it on an older one leaves a deposit no
 * one is authorised to mint.
 */
export async function isMintFeeApprovalRequired({
  chainId,
  token,
  env,
  rpcUrl,
}: IsMintFeeApprovalRequiredParams): Promise<boolean> {
  if (!requiresAutoMintFee(chainId)) {
    return false;
  }

  if (!MINT_FEE_TOKENS.includes(token)) {
    return true;
  }

  const address = getDepositFeeContract(token, chainId, env);
  if (!address) {
    return true;
  }

  try {
    await makePublicClient({ chainId, rpcUrl, env }).readContract({
      address,
      abi: DEPOSIT_FEE_ABI,
      functionName: 'getDepositFee',
    });
    return false;
  } catch {
    return true;
  }
}
