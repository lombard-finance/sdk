import { Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';

import { getExchangeRatio } from '../../api-functions/getLBTCExchangeRate/get-exchange-ratio';
import { StakeAndBakeToken } from '../../defi/defi-registry';
import { AddressKind, Token } from '../../tokens/token-addresses';
import { getTokenContractInfo } from '../../tokens/tokens';
import { ISignStakeAndBakeParams } from './signStakeAndBake';

/**
 * Calculate the permit value, applying BTC -> LBTC conversion if needed.
 */
export const getPermitValue = async (
  token: StakeAndBakeToken,
  value: BigNumber.Value,
  env: Env,
): Promise<BigNumber> => {
  if (!token || token === 'BTC') {
    return await calculateStakeAndBakeLBTCAmount(value, env);
  }
  return new BigNumber(value);
};

/**
 * Get the token contract info for the given token.
 * For BTCb, always uses AddressKind.Token (the ERC20 token contract, not the adapter).
 */
export const getStakeAndBakeTokenContract = async (
  token: StakeAndBakeToken,
  chainId: ISignStakeAndBakeParams['chainId'],
  env: Env,
): Promise<Awaited<ReturnType<typeof getTokenContractInfo>>> => {
  if (!token || token === 'BTC' || token === Token.LBTC) {
    return await getTokenContractInfo(Token.LBTC, chainId, env);
  }
  // For BTCb, use AddressKind.Token (ERC20 contract for permit/approve)
  return await getTokenContractInfo(token, chainId, env, AddressKind.Token);
};

/**
 * Helper function to calculate the correct LBTC amount for stake and bake
 * based on the current BTC to LBTC ratio.
 *
 * @param btcAmount - The original BTC amount entered by the user
 * @param env - The environment for fetching the exchange ratio
 * @returns The calculated LBTC amount that should be used in the permit signature
 */
/**
 * The value a BTC-funded vault permit must carry, in LBTC base units.
 *
 * BTC and LBTC are both 8-decimal, which makes it easy to believe the deposit
 * amount and the permit value are the same number. They are not: one BTC does
 * not buy one LBTC, so the deposit has to be divided by the current ratio. The
 * claimer finalises against the converted amount, so a permit signed for the
 * raw deposit is a permit for an amount that will never exist — it verifies,
 * it registers, and then nothing ever settles against it.
 *
 * Rounded down, because that is the integer the permit carries on chain.
 *
 * Exported because more than one caller builds this permit. Anything computing
 * it independently is one ratio step away from a signature the backend will
 * never match.
 */
export async function toStakeAndBakePermitValue(
  depositBaseUnits: BigNumber.Value,
  env?: Env,
): Promise<string> {
  const lbtcAmount = await calculateStakeAndBakeLBTCAmount(
    depositBaseUnits,
    env,
  );
  return lbtcAmount.toFixed(0, BigNumber.ROUND_DOWN);
}

export async function calculateStakeAndBakeLBTCAmount(
  btcAmount: BigNumber.Value,
  env?: Env,
): Promise<BigNumber> {
  try {
    const ratios = await getExchangeRatio({ env });
    const btcTokenRatio = ratios.LBTC?.BTCTokenRatio || new BigNumber(1);
    const lbtcAmount = new BigNumber(btcAmount).dividedBy(btcTokenRatio);

    return lbtcAmount;
  } catch {
    throw new Error('Failed to get exchange ratio for stake and bake');
  }
}
