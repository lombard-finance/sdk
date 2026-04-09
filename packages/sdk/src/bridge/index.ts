/** Generic bridge func */
export { bridge, type BridgeParameters } from "./lib/bridge";

/** CCIP bridge func */
export { bridgeCCIP, type BridgeCCIPParameters } from "./lib/ccip-bridge";

/** OFT bridge func */
export { bridgeOFT, type BridgeOFTParameters } from "./lib/oft-bridge";

/** Utils */
export {
  getBridgeInfo,
  OFT_GAS_LIMIT,
  OFT_HI_GAS_LIMIT,
  OFT_HI_GAS_LIMIT_CHAINS,
} from "./lib/config";
