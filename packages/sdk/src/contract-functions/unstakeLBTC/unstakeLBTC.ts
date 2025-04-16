import { getOutputScript } from '@lombard.finance/sdk-common';
import { CommonWriteParameters } from '../../common/parameters';
import { toSatoshi } from '../../utils/satoshi';
import { makeWalletClient } from '../../clients/wallet-client';
import { makePublicClient } from '../../clients/public-client';
import { getLBTCContractInfo } from '../../tokens/lbtc-contract';
import { CHAIN_ID_TO_VIEM_CHAIN_MAP } from '../../common/chains';
import { Hex } from 'viem';
import BigNumber from 'bignumber.js';

/**
 * The unstake parameters.
 */
export interface IUnstakeLBTCParams extends CommonWriteParameters {
  /**
   * The BTC address to send the unstaked BTC to.
   */
  btcAddress: string;
  /**
   * The amount of LBTC to unstake.
   */
  amount: BigNumber.Value;
}

/**
 * Unstakes (redeems) specified amount of LBTC and sends the equivalent amount
 * of BTC to the provided BTC address.
 * @param {IUnstakeLBTCParams} parameters - The unstake parameters.
 * @param {string} parameters.btcAddress - The BTC address.
 * @param {BigNumber.Value} parameters.amount - The amount of LBTC to unstake.
 * @param {Address} parameters.account - The EVM address.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {EIP1193Provider} parameters.provider - The EIP1193 provider.
 * @param {string} parameters.rpcUrl - The optional rpc url.
 */
export async function unstakeLBTC({
  btcAddress,
  amount,
  account,
  chainId,
  provider,
  rpcUrl,
  env,
}: IUnstakeLBTCParams): Promise<Hex> {
  const outputScript = getOutputScript(btcAddress, env);
  const amountSat = toSatoshi(amount).toNumber();

  const lbtcContract = getLBTCContractInfo(chainId, env);

  const publicClient = makePublicClient({ chainId, rpcUrl });
  const walletClient = makeWalletClient({ provider, chainId });

  const { request } = await publicClient.simulateContract({
    address: lbtcContract.address,
    account,
    chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
    abi: lbtcContract.abi,
    functionName: 'redeem',
    args: [outputScript, BigInt(amountSat)],
  });

  const txHash = await walletClient.writeContract(request);

  return txHash;
}
