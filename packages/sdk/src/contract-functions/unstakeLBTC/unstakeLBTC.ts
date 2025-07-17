import { getOutputScript } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import { Hex, parseGwei } from 'viem';
import { makePublicClient } from '../../clients/public-client';
import { makeWalletClient } from '../../clients/wallet-client';
import { CHAIN_ID_TO_VIEM_CHAIN_MAP, isKatanaChain } from '../../common/chains';
import { CommonWriteParameters } from '../../common/parameters';
import { Token } from '../../tokens/token-addresses';
import { getTokenContractInfo, isSTLBTCAbi } from '../../tokens/tokens';
import { estimateGasFees } from '../../utils/gas';
import { toSatoshi } from '../../utils/satoshi';

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
  return redeemToken({
    btcAddress,
    amount,
    account,
    chainId,
    provider,
    rpcUrl,
    env,
    token: Token.LBTC,
  });
}

export async function redeemToken({
  btcAddress,
  amount,
  account,
  chainId,
  provider,
  rpcUrl,
  env,
  token = Token.LBTC,
}: IUnstakeLBTCParams & { token?: Token }) {
  if (![Token.LBTC, Token.BTCK, Token.NativeLBTC].includes(token)) {
    throw new Error('Unsupported token');
  }

  if (token === Token.BTCK && !isKatanaChain(chainId)) {
    throw new Error('Operation not permitted');
  }

  const outputScript = getOutputScript(btcAddress, env);

  const amountSat = toSatoshi(amount).toNumber();

  const publicClient = makePublicClient({ chainId, rpcUrl, env });
  const walletClient = makeWalletClient({ provider, chainId });

  const tokenContract = getTokenContractInfo(token, chainId, env);

  const callData = {
    abi: tokenContract.abi,
    address: tokenContract.address,
    account,
    chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
    functionName:
      isSTLBTCAbi(tokenContract.abi) || token === Token.NativeLBTC
        ? 'redeemForBtc'
        : 'redeem', // FIXME: Change this to `redeemForBtc` once all contracts are updated.
    args: [outputScript, BigInt(amountSat)],
  } as const;

  const gasEstimationData = isKatanaChain(chainId)
    ? await estimateGasFees(publicClient, callData, parseGwei('1'))
    : {};

  const { request } = await publicClient.simulateContract(callData);

  const txHash = await walletClient.writeContract({
    ...request,
    ...gasEstimationData,
  });

  return txHash;
}
