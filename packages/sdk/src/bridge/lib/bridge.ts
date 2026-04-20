import BigNumber from 'bignumber.js';
import { Address } from 'viem';

import { CommonWriteParameters } from '../../common/parameters';
import { bridgeCCIP } from './ccip-bridge';
import {
  BRIDGE_EXPLORER_URL_MAP,
  BridgeChain,
  BridgeType,
  CCIP_BRIDGE_CHAINS,
  CCIPBridgeChain,
  getBridgeInfo,
  OFTBridgeChain,
} from './config';
import { bridgeOFT } from './oft-bridge';

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
} & CommonWriteParameters & {
    /**
     * A flag indicating whether the OFT bridge should be allowed.
     * Use at your onw risk!
     */
    experimentalAllowOFT?: boolean;
  };

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
  experimentalAllowOFT = false,
}: BridgeParameters) {
  const bridgeInfo = getBridgeInfo(chainId as BridgeChain, to);

  if (
    !bridgeInfo ||
    (!experimentalAllowOFT && bridgeInfo.type === BridgeType.OFT)
  ) {
    // The OFT bridges are disabled for now in this generic function as we're
    // working on moving all bridges to the CCIP method. OFT bridging shouldn't
    // be exposed.
    throw new Error(
      `Unsupported bridge from ${chainId} to ${to}. Please switch to the supported chains: ${CCIP_BRIDGE_CHAINS.join(', ')}`,
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
