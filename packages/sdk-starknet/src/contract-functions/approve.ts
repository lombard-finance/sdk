import { toBaseDenomination } from "@lombard.finance/sdk-common/utils/numbers";

import { getTokenContract, TokenParameters } from "../tokens/lib/tokens";
import { StarknetChainId } from "../utils/chains";
import { Address } from "../utils/common";
import { EnvParameters } from "../utils/env";
import { getRpcProvider } from "../utils/rpc-providers";
import { WalletAccountParameters } from "../utils/wallet-account";

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

  // Use SDK's RPC provider for read-only operations to avoid wallet RPC rate limits
  // (Wallet extensions like Braavos/ArgentX use OnFinality which has strict rate limits)
  const rpcProvider = getRpcProvider(chainId);

  // Read decimals using SDK RPC (avoid wallet rate limits)
  const readOnlyContract = getTokenContract({
    chainId,
    contractType: "token",
    provider: rpcProvider,
    token,
    env,
  });

  const decimals = await readOnlyContract.decimals();
  const amountBaseDenom = toBaseDenomination(amount, Number(decimals));

  // Use walletAccount for write operation (signing tx)
  const tokenContract = getTokenContract({
    chainId,
    contractType: "token",
    provider: walletAccount,
    token,
    env,
  });

  const tx = await tokenContract.approve(spender, amountBaseDenom.toNumber());

  return tx.transaction_hash;
}
