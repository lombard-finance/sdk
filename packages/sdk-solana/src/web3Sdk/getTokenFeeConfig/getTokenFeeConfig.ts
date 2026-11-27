import { Env } from '@lombard.finance/sdk-common';
import { PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';

import { DEFAULT_ENV, getConfig } from '../../const/getConfig';
import { getConnection } from '../../const/rpcUrls';
import { SolanaNetwork } from '../../types';
import { ErrorCode, SolanaSdkError } from '../../utils';

const BTC_DECIMALS = 8;
const SATOSHI_SCALE = new BigNumber(10).pow(BTC_DECIMALS);
const ANCHOR_DISCRIMINATOR_SIZE = 8;

/**
 * Anchor account layout for Asset Router's `TokenConfig`:
 *   discriminator (8) | redeem_fee (u64) | redeem_for_btc_min_amount (u64)
 *   | max_mint_commission (u64) | to_native_commission (u64)
 *   | ledger_redeem_handler ([u8; 32])
 */
const TOKEN_CONFIG_MIN_SIZE = ANCHOR_DISCRIMINATOR_SIZE + 8 + 8 + 8 + 8 + 32;

function fromSatoshi(amount: bigint): BigNumber {
  return new BigNumber(amount.toString()).dividedBy(SATOSHI_SCALE);
}

function readU64LE(buf: Buffer, offset: number): bigint {
  return buf.readBigUInt64LE(offset);
}

export interface GetTokenFeeConfigParams {
  /** SPL token mint address. Defaults to LBTC mint from config. */
  tokenMint?: string;
  network: SolanaNetwork;
  env?: Env;
  rpcUrl?: string;
}

export interface TokenFeeConfigResult {
  redeemFee: BigNumber;
  redeemForBtcMinAmount: BigNumber;
  maxMintCommission: BigNumber;
  toNativeCommission: BigNumber;
}

/**
 * Fetches the Asset Router `TokenConfig` account for a given token mint.
 *
 * The account holds protocol fee parameters set by governance:
 * redeem fee, min redeem amount, max mint commission, and native commission.
 */
export async function getTokenFeeConfig(
  params: GetTokenFeeConfigParams,
): Promise<TokenFeeConfigResult> {
  const { network, env: envOverride, rpcUrl, tokenMint } = params;
  const env = envOverride ?? DEFAULT_ENV;
  const config = getConfig(env);

  if (!config.assetRouter) {
    throw new SolanaSdkError(
      `Asset Router not configured for env: ${env}`,
      ErrorCode.INVALID_PARAMS,
    );
  }

  const mintAddress = tokenMint ?? config.lbtcTokenMint;
  const mint = new PublicKey(mintAddress);
  const assetRouterProgramId = new PublicKey(config.assetRouter);

  const connection = getConnection(network, rpcUrl, env);

  const [tokenConfigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('token_config'), mint.toBuffer()],
    assetRouterProgramId,
  );

  try {
    const accountInfo = await connection.getAccountInfo(tokenConfigPDA);

    if (!accountInfo) {
      throw new Error(`TokenConfig account not found for mint ${mintAddress}`);
    }

    if (accountInfo.data.length < TOKEN_CONFIG_MIN_SIZE) {
      throw new Error(
        `TokenConfig account data too short: expected >= ${TOKEN_CONFIG_MIN_SIZE} bytes, got ${accountInfo.data.length}`,
      );
    }

    const buf = accountInfo.data;
    const off = ANCHOR_DISCRIMINATOR_SIZE;

    return {
      redeemFee: fromSatoshi(readU64LE(buf, off)),
      redeemForBtcMinAmount: fromSatoshi(readU64LE(buf, off + 8)),
      maxMintCommission: fromSatoshi(readU64LE(buf, off + 16)),
      toNativeCommission: fromSatoshi(readU64LE(buf, off + 24)),
    };
  } catch (error) {
    throw SolanaSdkError.wrap(
      error,
      ErrorCode.RPC_ERROR,
      `Failed to fetch token config for mint ${mintAddress}`,
    );
  }
}

/**
 * Total redeem fee for burning tokens back to BTC on Solana.
 * Equivalent to EVM `getRedeemFee`: `toNativeCommission + redeemFee`.
 */
export async function getRedeemFeeSolana(
  params: GetTokenFeeConfigParams,
): Promise<BigNumber> {
  const cfg = await getTokenFeeConfig(params);
  return cfg.toNativeCommission.plus(cfg.redeemFee);
}

/**
 * Max minting commission on Solana.
 * Equivalent to EVM `getMintingFee`.
 */
export async function getMintingFeeSolana(
  params: GetTokenFeeConfigParams,
): Promise<BigNumber> {
  const cfg = await getTokenFeeConfig(params);
  return cfg.maxMintCommission;
}

/**
 * Minimum redeem amount (excluding fee) on Solana.
 * Equivalent to EVM `getMinRedeemAmount`.
 */
export async function getMinRedeemAmountSolana(
  params: GetTokenFeeConfigParams,
): Promise<BigNumber> {
  const cfg = await getTokenFeeConfig(params);
  return cfg.redeemForBtcMinAmount;
}

/**
 * Minimum transfer amount the user must provide for a successful redemption.
 * Equals `redeemFee + toNativeCommission + redeemForBtcMinAmount`.
 * Equivalent to EVM `getMinRedeemAmountWithFee`.
 */
export async function getMinRedeemAmountWithFeeSolana(
  params: GetTokenFeeConfigParams,
): Promise<BigNumber> {
  const cfg = await getTokenFeeConfig(params);
  return cfg.toNativeCommission
    .plus(cfg.redeemFee)
    .plus(cfg.redeemForBtcMinAmount);
}
