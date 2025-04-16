import { CHAIN_ID_TO_VIEM_CHAIN_MAP } from '../../common/chains';
import { makeWalletClient } from '../../clients/wallet-client';
import { CommonWriteParameters } from '../../common/parameters';
import { toSatoshi } from '../../utils/satoshi';
import { getLBTCContractInfo } from '../../tokens/lbtc-contract';
import { Address, Hash } from 'viem';
import { makePublicClient } from '../../clients/public-client';
import BigNumber from 'bignumber.js';

export interface IApproveLBTCParams extends CommonWriteParameters {
  /**
   * The spender account address.
   */
  spender: Address;
  /**
   * The approved amount of LBTC.
   */
  amount: BigNumber.Value;
}

/**
 * Approves the provided spender to withdraw a specified amount of LBTC from
 * your account.
 *
 * @param {IApproveLBTCParams} parameters - The parameters.
 * @param {Address} spender - The spender account address.
 * @param {BigNumber.Value} - The amount of LBTC.
 * @param {Address} parameters.account - The EVM account address.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {EIP1193Provider} parameters.provider - The EIP1193 provider.
 * @param {string} parameters.rpcUrl - The optional rpc url.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @returns {Promise<Hash>}
 */
export async function approveLBTC({
  account,
  spender,
  amount,
  chainId,
  provider,
  rpcUrl,
  env,
}: IApproveLBTCParams): Promise<Hash> {
  const publicClient = makePublicClient({ chainId, rpcUrl });
  const walletClient = makeWalletClient({ chainId, provider });

  const lbtcContract = getLBTCContractInfo(chainId, env);

  const amountSat = toSatoshi(amount).toNumber();

  const { request } = await publicClient.simulateContract({
    address: lbtcContract.address,
    account,
    chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
    abi: lbtcContract.abi,
    functionName: 'approve',
    args: [spender, BigInt(amountSat)],
  });

  const txHash = await walletClient.writeContract(request);

  return txHash;
}
