import { Options } from '@layerzerolabs/lz-v2-utilities';
import BigNumber from 'bignumber.js';
import { Address, pad } from 'viem';
import { makePublicClient } from '../../clients/public-client';
import { makeWalletClient } from '../../clients/wallet-client';
import { ChainId } from '../../common/chains';
import { CommonWriteParameters } from '../../common/parameters';
import { approveLBTC } from '../../contract-functions';
import { Token } from '../../tokens/token-addresses';
import {
  fromBaseDenomination,
  getTokenInfo,
  toBaseDenomination,
} from '../../tokens/tokens';
import { getErrorMessage } from '../../utils/err';
import toBigInt from '../../utils/numbers';
import {
  BridgeType,
  MIN_BRIDGE_AMOUNT,
  OFTBridgeChain,
  OFT_BRIDGE_CHAINS,
  OFT_GAS_LIMIT,
  OFT_HI_GAS_LIMIT,
  OFT_HI_GAS_LIMIT_CHAINS,
  getBridgeInfo,
} from './config';

const DESTINATION_ENDPOINT_ID_MAP: Record<OFTBridgeChain, number> = {
  // Mainnets:
  [ChainId.ethereum]: 30101,
  [ChainId.berachain]: 30362,
  [ChainId.corn]: 30331,
  [ChainId.etherlink]: 30292,
  [ChainId.swell]: 30335,
  [ChainId.tac]: 30377,
  // Testnets:
  [ChainId.sepolia]: 40161,
  [ChainId.berachainBartioTestnet]: 40291,
};

export type BridgeOFTParameters = {
  /** The destination chain id. */
  to: OFTBridgeChain;
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
export async function bridgeOFT({
  to,
  amount: amountRaw,
  approve,
  recipient: optionalRecipient,
  account,
  chainId: from,
  provider,
  env,
  rpcUrl,
}: BridgeOFTParameters) {
  console.warn(
    'The "bridgeOFT" function is provided as is and it is not the recommended way of bridging tokens between chains. Please, use "bridgeCCIP" or the generic "bridge" function.',
  );

  const amount = BigNumber(amountRaw);
  const recipient = optionalRecipient || account;

  const bridgeInfo = getBridgeInfo(from as OFTBridgeChain, to);
  if (!bridgeInfo || bridgeInfo.type !== BridgeType.OFT) {
    throw new Error(
      `Unsupported bridge from ${from} to ${to}. Please switch to the supported chains: ${OFT_BRIDGE_CHAINS.join(', ')}`,
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

  const extraOptions = Options.newOptions().addExecutorLzReceiveOption(
    (OFT_HI_GAS_LIMIT_CHAINS as number[]).includes(to)
      ? OFT_HI_GAS_LIMIT
      : OFT_GAS_LIMIT,
    0,
  );

  /** _sendParam */
  const sendParam = [
    /** dstEid - uint32 */
    DESTINATION_ENDPOINT_ID_MAP[to],
    /** to - bytes32 */
    pad(recipient),
    /** amountLD - uint256 */
    amountBase,
    /** minAmountLD - uint256 */
    amountBase,
    /** extraOptions - bytes */
    extraOptions.toHex(),
    /** composeMsg - bytes */
    '0x',
    /** oftCmd - bytes */
    '0x',
  ];

  const { nativeFee, lzTokenFee } = (await publicClient.readContract({
    abi: bridgeContract.abi,
    address: bridgeContract.address,
    account,
    functionName: 'quoteSend',
    args: [sendParam, false],
  })) as { nativeFee: bigint; lzTokenFee: bigint };

  const bridgeArgs = [
    /** _sendParam */
    sendParam,
    /** _fee */
    [
      /** nativeFee - uint256 */
      nativeFee,
      /** lzTokenFee - uint256 */
      lzTokenFee,
    ],
    /** address - address */
    account,
  ];

  const { request } = await publicClient.simulateContract({
    abi: bridgeContract.abi,
    address: bridgeContract.address,
    account,
    functionName: 'send',
    args: bridgeArgs,
    value: nativeFee,
  });

  const txHash = await walletClient.writeContract(request);
  return txHash;
}
