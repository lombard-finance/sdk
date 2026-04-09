import BigNumber from "bignumber.js";

import { getOftAmountCanBeSent as getOftAmountCanBeSentActual } from "./getOftAmountCanBeSent";
import { quoteBridgeFee as quoteBridgeFeeActual } from "./quoteBridgeFee";
import { sendBridgeTransaction as sendBridgeTransactionActual } from "./sendBridgeTransaction";
type QuoteBridgeFeeParams = Parameters<typeof quoteBridgeFeeActual>[0];
type QuoteBridgeFeeResult = Awaited<ReturnType<typeof quoteBridgeFeeActual>>;
type SendBridgeTransactionParams = Parameters<
  typeof sendBridgeTransactionActual
>[0];
type GetOftAmountCanBeSentParams = Parameters<
  typeof getOftAmountCanBeSentActual
>[0];

interface BridgeFunctions {
  quoteBridgeFee: (
    params: QuoteBridgeFeeParams,
  ) => Promise<QuoteBridgeFeeResult>;
  sendBridgeTransaction: (
    params: SendBridgeTransactionParams,
  ) => Promise<string>;
  getOftAmountCanBeSent: (
    params: GetOftAmountCanBeSentParams,
  ) => Promise<BigNumber>;
}

let loadedFunctions: BridgeFunctions | null = null;

/**
 * Dynamically loads the bridge functions (quoteBridgeFee, sendBridgeTransaction).
 * This prevents the large LayerZero dependencies from being included in the initial bundle.
 */
export async function loadBridgeFunctions(): Promise<BridgeFunctions> {
  if (loadedFunctions) {
    return loadedFunctions;
  }

  const quoteModule = await import("./quoteBridgeFee");
  const sendModule = await import("./sendBridgeTransaction");
  const getOftAmountCanBeSentModule = await import("./getOftAmountCanBeSent");
  loadedFunctions = {
    quoteBridgeFee: quoteModule.quoteBridgeFee,
    sendBridgeTransaction: sendModule.sendBridgeTransaction,
    getOftAmountCanBeSent: getOftAmountCanBeSentModule.getOftAmountCanBeSent,
  };

  return loadedFunctions;
}

export type {
  QuoteBridgeFeeParams,
  QuoteBridgeFeeResult,
  SendBridgeTransactionParams,
};
