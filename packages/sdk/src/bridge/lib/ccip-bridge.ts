import BigNumber from 'bignumber.js';
import {
  Address,
  encodeAbiParameters,
  encodePacked,
  parseAbiParameters } from 'viem';

import { makePublicClient } from '../../clients/public-client';
import { makeWalletClient } from '../../clients/wallet-client';
import { CommonWriteParameters } from '../../common/parameters';
import { approveLBTC } from '../../contract-functions';
import { Token } from '../../tokens/token-addresses';
import {
  fromBaseDenomination,
  getTokenInfo,
  toBaseDenomination } from '../../tokens/tokens';
import { getErrorMessage } from '../../utils/err';
import toBigInt from '../../utils/numbers';
import CCIP_ROUTER_ABI from '../abi/CCIP_ROUTER_ABI.json';
import { getCCIPConfig } from './ccip-config';
import {
  BridgeType,
  CCIP_BRIDGE_CHAINS,
  CCIPBridgeChain,
  getBridgeInfo,
  MIN_BRIDGE_AMOUNT } from './config';

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

/**
 * Encodes extraArgs for CCIP according to version 1
 * Format: EVMExtraArgsV1 { gasLimit: uint256 }
 *
 * @see https://github.com/smartcontractkit/smart-contract-examples/blob/main/ccip/offchain/javascript/src/transfer-tokens.js
 */
function encodeExtraArgs(gasLimit: bigint): `0x${string}` {
  // Tag for EVMExtraArgsV1
  const tag = '0x97a657c9';

  // Encode gasLimit as uint256
  const encodedGasLimit = encodePacked(['uint256'], [gasLimit]);

  return `${tag}${encodedGasLimit.slice(2)}` as `0x${string}`;
}

/**
 * Transfers tokens via CCIP using direct Router contract calls
 * Based on Chainlink example:
 * @see https://github.com/smartcontractkit/smart-contract-examples/blob/main/ccip/offchain/javascript/src/transfer-tokens.js
 */
export async function bridgeCCIP({
  to,
  amount: amountRaw,
  approve,
  recipient: optionalRecipient,
  account,
  chainId: from,
  provider,
  env,
  rpcUrl }: BridgeCCIPParameters) {
  const amount = BigNumber(amountRaw);
  const recipient = optionalRecipient || account;

  const bridgeInfo = getBridgeInfo(from as CCIPBridgeChain, to);
  if (!bridgeInfo || bridgeInfo.type !== BridgeType.CCIP) {
    throw new Error(
      `Unsupported bridge from ${from} to ${to}. Please switch to the supported chains: ${CCIP_BRIDGE_CHAINS.join(', ')}`,
    );
  }

  // Get CCIP Router configuration
  const sourceChainConfig = getCCIPConfig(from);
  const destinationChainConfig = getCCIPConfig(to);

  if (!sourceChainConfig || !destinationChainConfig) {
    throw new Error(`CCIP configuration not found for chains ${from} -> ${to}`);
  }

  const routerAddress = sourceChainConfig.routerAddress;

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
    args: [account] });
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
    args: [account, routerAddress] });
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

    // try to approve new amount for Router
    console.info(exceededMessage);
    try {
      const txHash = await approveLBTC({
        account,
        spender: routerAddress,
        amount,
        chainId: from,
        provider,
        rpcUrl,
        env });
      console.info(`Approve tx hash: ${txHash}`);
      console.info(`Approved ${amountBase} for ${routerAddress}`);
    } catch (err) {
      const msg = getErrorMessage(err);
      throw new Error(
        `Could not approve ${amountBase} for ${routerAddress}. \nReason: ${msg}`,
      );
    }
  }

  // Build CCIP message (EVM2AnyMessage)
  // IMPORTANT: receiver must be abi.encode(address) for EVM chains, not encodePacked
  const receiverBytes = encodeAbiParameters(parseAbiParameters('address'), [
    recipient,
  ]);
  const extraArgs = encodeExtraArgs(0n);

  const message = {
    receiver: receiverBytes,
    data: '0x' as `0x${string}`,
    tokenAmounts: [
      {
        token: lbtcContract.address,
        amount: amountBase },
    ],
    feeToken: '0x0000000000000000000000000000000000000000' as Address, // address(0) means payment in native currency
    extraArgs, // 0 = automatic gas limit calculation
  };

  // Get fee for sending the message
  const fee = (await publicClient.readContract({
    address: routerAddress,
    abi: CCIP_ROUTER_ABI,
    functionName: 'getFee',
    args: [BigInt(destinationChainConfig.chainSelector), message] })) as bigint;

  // Send CCIP message
  const { request } = await publicClient.simulateContract({
    address: routerAddress,
    abi: CCIP_ROUTER_ABI,
    account,
    functionName: 'ccipSend',
    args: [BigInt(destinationChainConfig.chainSelector), message],
    value: fee });

  const txHash = await walletClient.writeContract(request);
  return txHash;
}
