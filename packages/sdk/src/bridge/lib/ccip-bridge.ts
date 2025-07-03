import BigNumber from 'bignumber.js';
import { CommonWriteParameters } from '../../common/parameters';
import {
  BridgeType,
  CCIP_BRIDGE_CHAINS,
  CCIPBridgeChain,
  getBridgeInfo,
  MIN_BRIDGE_AMOUNT,
} from './config';
import { makePublicClient } from '../../clients/public-client';
import { makeWalletClient } from '../../clients/wallet-client';
import {
  fromBaseDenomination,
  getTokenInfo,
  toBaseDenomination,
} from '../../tokens/tokens';
import { getErrorMessage } from '../../utils/err';
import toBigInt from '../../utils/numbers';
import { Address, pad, toHex } from 'viem';
import { approveLBTC } from '../../contract-functions';
import { Token } from '../../tokens/token-addresses';

export type BridgeCCIPParameters = {
  /** The destination chain id. */
  to: CCIPBridgeChain;
  /** The LBTC amount. */
  amount: BigNumber.Value;
  /**
   * A flag determining whether the amount should be approved within
   * the execution of this function. If set to `false` it will
   * throw an error when the deposit amount exceeds allowance.
   */
  approve?: boolean;
  /** The destination address. If omitted the same as the account address. */
  recipient?: Address;
} & CommonWriteParameters;
export async function bridgeCCIP({
  to,
  amount: amountRaw,
  approve,
  recipient: optionalRecipient,
  account,
  chainId: from,
  provider,
  env,
  rpcUrl,
}: BridgeCCIPParameters) {
  const amount = BigNumber(amountRaw);
  const recipient = optionalRecipient || account;

  const bridgeInfo = getBridgeInfo(from as CCIPBridgeChain, to);
  if (!bridgeInfo || bridgeInfo.type !== BridgeType.CCIP) {
    throw new Error(
      `Unsupported bridge from ${from} to ${to}. Please switch to the supported chains: ${CCIP_BRIDGE_CHAINS.join(', ')}`,
    );
  }

  const bridgeContract = bridgeInfo.contract;

  const lbtcContract = await getTokenInfo(Token.LBTC, from, env, rpcUrl);
  if (!lbtcContract) {
    throw new Error('Could not retrieve LBTC contract info.');
  }

  const publicClient = makePublicClient({ chainId: from, rpcUrl });
  const walletClient = makeWalletClient({ provider, chainId: from });

  const amountBase = toBigInt(
    toBaseDenomination(amount, lbtcContract.decimals),
  );

  if (amount.isLessThan(MIN_BRIDGE_AMOUNT)) {
    throw new Error(
      `The amount is smaller than the minimum amount allowed: ${MIN_BRIDGE_AMOUNT.toFixed()}`,
    );
  }

  const balanceRaw = await publicClient.readContract({
    address: lbtcContract.address,
    abi: lbtcContract.abi,
    functionName: 'balanceOf',
    args: [account],
  });
  const balance = fromBaseDenomination(
    String(balanceRaw),
    lbtcContract.decimals,
  );

  // check if amount exceeds balance
  if (amount.isGreaterThan(balance)) {
    throw new Error(
      `The amount exceeds the account's balance. \nAmount: ${amount.toFixed()} \nBalance: ${balance.toFixed()}`,
    );
  }

  const allowanceRaw = await publicClient.readContract({
    address: lbtcContract.address,
    abi: lbtcContract.abi,
    functionName: 'allowance',
    args: [account, bridgeContract.address],
  });
  const allowance = fromBaseDenomination(
    String(allowanceRaw),
    lbtcContract.decimals,
  );

  // check if amount exceeds allowance
  if (amount.isGreaterThan(allowance)) {
    const exceededMessage = `The amount exceeds allowance. \nAmount: ${amount.toFixed()} \nAllowance: ${allowance.toFixed()}`;
    if (!approve) {
      throw new Error(exceededMessage);
    }

    // try to approve new amount
    console.info(exceededMessage);
    try {
      const txHash = await approveLBTC({
        account,
        spender: bridgeContract.address,
        amount,
        chainId: from,
        provider,
        rpcUrl,
        env,
      });
      console.info(`Approve tx hash: ${txHash}`);
      console.info(`Approved ${amountBase} for ${bridgeContract.address}`);
    } catch (err) {
      const msg = getErrorMessage(err);
      throw new Error(
        `Could not approve ${amountBase} for ${bridgeContract.address}. \nReason: ${msg}`,
      );
    }
  }

  const bridgeArgs = [
    /** toChain - bytes32 */
    toHex(to, { size: 32 }),
    /** toAddress - bytes32 */
    pad(recipient),
    /** amount - uint64 */
    amountBase,
  ];

  const adapterFee = (await publicClient.readContract({
    abi: bridgeContract.abi,
    address: bridgeContract.address,
    functionName: 'getAdapterFee',
    args: bridgeArgs,
  })) as bigint;

  const { request } = await publicClient.simulateContract({
    abi: bridgeContract.abi,
    address: bridgeContract.address,
    account,
    functionName: 'deposit',
    args: bridgeArgs,
    value: adapterFee,
  });

  const txHash = await walletClient.writeContract(request);
  return txHash;
}
