import BigNumber from 'bignumber.js';
import { bridgeCCIP } from './ccip-bridge';
import {
  BRIDGE_CHAINS,
  BRIDGE_EXPLORER_URL_MAP,
  BridgeChain,
  BridgeType,
  CCIPBridgeChain,
  getBridgeInfo,
  OFTBridgeChain,
} from './config';
import { bridgeOFT } from './oft-bridge';
import { Address } from 'viem';
import { CommonWriteParameters } from '../../common/parameters';

export type BridgeParameters = {
  /** The destination chain id. */
  to: BridgeChain;
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
 * Bridges funds (`amount`) from the connected chain (`chainId`) to the provided
 * destination chain (`to`)
 */
export async function bridge({
  to,
  amount,
  approve,
  account,
  chainId,
  provider,
  recipient,
  rpcUrl,
  env,
}: BridgeParameters) {
  const bridgeInfo = getBridgeInfo(chainId as BridgeChain, to);

  if (!bridgeInfo) {
    throw new Error(
      `Unsupported bridge from ${chainId} to ${to}. Please switch to the supported chains: ${BRIDGE_CHAINS.join(', ')}`,
    );
  }

  switch (bridgeInfo.type) {
    case BridgeType.CCIP: {
      const txHash = await bridgeCCIP({
        to: to as CCIPBridgeChain,
        amount,
        approve,
        recipient,
        account,
        chainId,
        provider,
        env,
        rpcUrl,
      });

      return {
        txHash,
        explorerUrl: BRIDGE_EXPLORER_URL_MAP[BridgeType.CCIP].replace(
          '{txHash}',
          txHash,
        ),
        type: BridgeType.CCIP,
      };
    }

    case BridgeType.OFT: {
      const txHash = await bridgeOFT({
        to: to as OFTBridgeChain,
        amount,
        approve,
        recipient,
        account,
        chainId,
        provider,
        env,
        rpcUrl,
      });

      return {
        txHash,
        explorerUrl: BRIDGE_EXPLORER_URL_MAP[BridgeType.OFT].replace(
          '{txHash}',
          txHash,
        ),
        type: BridgeType.OFT,
      };
    }
  }
}
