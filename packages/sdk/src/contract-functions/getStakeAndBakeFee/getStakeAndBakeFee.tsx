import { DEFAULT_ENV } from "@lombard.finance/sdk-common";
import BigNumber from "bignumber.js";
import { getContract } from "viem";

import { makePublicClient } from "../../clients/public-client";
import { CommonParameters } from "../../common/parameters";
import {
  DefiProtocol,
  DefiProtocols,
  StakeAndBakeToken,
} from "../../defi/defi-registry";
import { Token } from "../../tokens/token-addresses";
import { getErrorMessage } from "../../utils/err";
import { fromSatoshi } from "../../utils/satoshi";
import { getStakeAndBakeConfig } from "../signStakeAndBake/validation";

/**
 * Default token mapping for each protocol.
 * Used when token is not explicitly provided.
 */
const PROTOCOL_DEFAULT_TOKENS: Record<DefiProtocol, StakeAndBakeToken> = {
  [DefiProtocol.Veda]: Token.LBTC,
  [DefiProtocol.Silo]: Token.BTCb,
};

export interface IGetStakeAndBakeFeeParams extends CommonParameters {
  /**
   * The DeFi protocol identifier (e.g., Veda, Silo).
   */
  protocol?: DefiProtocol;
  /**
   * The token to query the fee for (optional).
   * If not provided, defaults to the protocol's primary token:
   * - Veda: LBTC
   * - Silo: BTCb
   */
  token?: StakeAndBakeToken;
}

/**
 * Get Stake and bake fee for a specific DeFi protocol and token.
 *
 * If token is not provided, uses the default token for the protocol:
 * - Veda: LBTC
 * - Silo: BTCb
 *
 * @param {IGetStakeAndBakeFeeParams} parameters - The parameters.
 * @param {DefiProtocol} parameters.protocol - The optional DeFi protocol identifier (defaults to Veda).
 * @param {StakeAndBakeToken} parameters.token - The optional token (defaults to protocol's primary token).
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {Env} parameters.env - The environment (prod, testnet, etc.).
 * @param {string} parameters.rpcUrl - The optional rpc url.
 *
 * @returns Stake and bake fee amount.
 */
export async function getStakeAndBakeFee({
  protocol = DefiProtocol.Veda,
  token,
  chainId,
  env = DEFAULT_ENV,
  rpcUrl,
}: IGetStakeAndBakeFeeParams): Promise<BigNumber> {
  const protocolInfo = DefiProtocols[protocol];
  if (!protocolInfo) {
    throw new Error(`Unknown protocol: ${protocol}`);
  }

  // Use provided token or default to protocol's primary token
  const selectedToken = token ?? PROTOCOL_DEFAULT_TOKENS[protocol];

  // We use getStakeAndBakeConfig to ensure chain/env compatibility
  try {
    const strategy = getStakeAndBakeConfig(
      protocol,
      selectedToken,
      chainId,
      env,
    );

    const spenderContract = strategy.spenderContract;
    if (!spenderContract) {
      throw new Error(
        `Could not retrieve the stake and bake contract for ${protocol} on chain ${chainId}.`,
      );
    }

    const client = makePublicClient({ chainId, rpcUrl });
    const contract = getContract({
      abi: spenderContract.abi,
      address: spenderContract.address,
      client,
    });
    const fee = await contract.read.getStakeAndBakeFee();
    return fromSatoshi(String(fee));
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    throw new Error(
      `Failed to get stake and bake fee for ${protocolInfo.name}: ${errorMessage}`,
    );
  }
}
