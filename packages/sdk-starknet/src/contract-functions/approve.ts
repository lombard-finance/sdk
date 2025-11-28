import { toBaseDenomination } from '@lombard.finance/sdk-common/utils/numbers';

import { getTokenContract, TokenParameters } from '../tokens/lib/tokens';
import { StarknetChainId } from '../utils/chains';
import { Address } from '../utils/common';
import { EnvParameters } from '../utils/env';
import { WalletAccountParameters } from '../utils/wallet-account';

type ApproveParameters = {
  /** The approved amount. */
  amount: BigNumber.Value;
  /** The spender address. */
  spender: Address;
} & TokenParameters &
  WalletAccountParameters &
  EnvParameters;

export async function approve({
  amount,
  spender,
  token,
  walletAccount,
  env,
}: ApproveParameters) {
  const chainId = (await walletAccount.getChainId()) as StarknetChainId;

  const tokenContract = getTokenContract({
    chainId,
    contractType: 'token',
    provider: walletAccount,
    token,
    env,
  });

  const decimals = await tokenContract.decimals();
  const amountBaseDenom = toBaseDenomination(amount, Number(decimals));

  const tx = await tokenContract.approve(spender, amountBaseDenom.toNumber());

  return tx.transaction_hash;
}
