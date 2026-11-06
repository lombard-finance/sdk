import { Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';

import { getExchangeRatio } from '../../api-functions/getLBTCExchangeRate/get-exchange-ratio';
import { StakeAndBakeToken } from '../../defi/defi-registry';
import { LombardError, ValidationErrorCode } from '../../shared/errors';
import {
  AddressKind,
  getTokenAddressForChain,
  Token,
} from '../../tokens/token-addresses';
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

/** The token a permit for `token` is signed against: LBTC for native BTC. */
function permitToken(token: StakeAndBakeToken): Token.LBTC | Token.BTCb {
  return !token || token === 'BTC' ? Token.LBTC : token;
}

/**
 * Get the token contract info for the given token.
 * For BTCb, always uses AddressKind.Token (the ERC20 token contract, not the adapter).
 */
export const getStakeAndBakeTokenContract = async (
  token: StakeAndBakeToken,
  chainId: ISignStakeAndBakeParams['chainId'],
  env: Env,
): Promise<Awaited<ReturnType<typeof getTokenContractInfo>>> => {
  // For BTCb, use AddressKind.Token (ERC20 contract for permit/approve)
  return await getTokenContractInfo(
    permitToken(token),
    chainId,
    env,
    AddressKind.Token,
  );
};

/**
 * The address of the token a stake-and-bake permit for `token` is signed
 * against, its `domain.verifyingContract`: the contract
 * {@link getStakeAndBakeTokenContract} resolves, read from the address book
 * without a call to the chain. `undefined` where the token has no address.
 */
export const getStakeAndBakeTokenAddress = (
  token: StakeAndBakeToken,
  chainId: ISignStakeAndBakeParams['chainId'],
  env: Env,
): string | undefined =>
  getTokenAddressForChain(chainId, AddressKind.Token, env, permitToken(token));

/**
 * The band the BTC:LBTC price the permit value is divided by must sit in.
 *
 * The price is how much BTC one LBTC is worth: a little over 1, rising as
 * LBTC accrues. It comes from the gateway, so a missing or substituted figure
 * reaches the permit the user signs: a price of 0.001 asks for a permit a
 * thousand times the deposit, and the 1 the conversion used to fall back to
 * signs the raw satoshis, which the claimer never matches. A tenth either
 * side of par is years of accrual away from today's figure, so a real price
 * does not leave it and anything outside it is refused.
 */
const MIN_BTC_TOKEN_RATIO = new BigNumber('0.9');
const MAX_BTC_TOKEN_RATIO = new BigNumber('1.1');

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
 * The public form of the conversion. `signStakeAndBake` applies the same two
 * steps inline rather than calling this, because it needs the unrounded figure
 * to say what a refused amount converted to; `getPermitValue` does the same for
 * the resume check. All three divide by the ratio and round down, and they have
 * to stay in step: anything computing this differently is one ratio step away
 * from a signature the backend will never match.
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

/**
 * Helper function to calculate the correct LBTC amount for stake and bake
 * based on the current BTC to LBTC ratio.
 *
 * @param btcAmount - The original BTC amount entered by the user
 * @param env - The environment for fetching the exchange ratio
 * @returns The calculated LBTC amount that should be used in the permit signature
 * @throws {LombardError} When the ratio is missing, not a finite number, or
 * outside {@link MIN_BTC_TOKEN_RATIO} to {@link MAX_BTC_TOKEN_RATIO}.
 */
export async function calculateStakeAndBakeLBTCAmount(
  btcAmount: BigNumber.Value,
  env?: Env,
): Promise<BigNumber> {
  let ratios: Awaited<ReturnType<typeof getExchangeRatio>>;
  try {
    ratios = await getExchangeRatio({ env });
  } catch {
    throw new Error('Failed to get exchange ratio for stake and bake');
  }

  // No fallback: a ratio the conversion cannot trust is a permit it cannot
  // build. Substituting 1 signed the raw deposit, which nothing settles.
  const btcTokenRatio = ratios?.LBTC?.BTCTokenRatio;
  if (
    !btcTokenRatio ||
    !BigNumber.isBigNumber(btcTokenRatio) ||
    !btcTokenRatio.isFinite() ||
    btcTokenRatio.isLessThan(MIN_BTC_TOKEN_RATIO) ||
    btcTokenRatio.isGreaterThan(MAX_BTC_TOKEN_RATIO)
  ) {
    throw new LombardError(
      ValidationErrorCode.INVALID_AMOUNT,
      `The BTC:LBTC exchange ratio ${String(btcTokenRatio)} is missing or ` +
        `outside ${MIN_BTC_TOKEN_RATIO.toFixed()} to ` +
        `${MAX_BTC_TOKEN_RATIO.toFixed()}, so the deposit cannot be converted ` +
        `into a permit value. Nothing was signed.`,
    );
  }

  const lbtcAmount = new BigNumber(btcAmount).dividedBy(btcTokenRatio);
  if (!lbtcAmount.isFinite()) {
    throw new LombardError(
      ValidationErrorCode.INVALID_AMOUNT,
      `${String(btcAmount)} does not convert to a finite permit value.`,
    );
  }

  return lbtcAmount;
}
