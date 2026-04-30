/**
 * Automint Fee Contract Read Verification
 *
 * Validates that automint fees are non-zero where expected using read-only
 * contract calls (no signing or funds required).
 *
 * @module __tests__/integration/automint-fee.integration.test.ts
 */

import { Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import { describe, expect, it } from 'vitest';

import { ChainId } from '../../common/chains';
import { getMintingFee } from '../../contract-functions/getLBTCMintingFee/getLBTCMintingFee';
import { Token,TOKEN_ADDRESSES } from '../../tokens/token-addresses';

const RUN_CONTRACT_CHECKS = process.env.ENABLE_CONTRACT_CHECKS === 'true';
const runIfEnabled = RUN_CONTRACT_CHECKS ? describe : describe.skip;

const TIMEOUT = 90_000;

function expectNonZeroFee(fee: BigNumber, label: string) {
  expect(fee.isGreaterThan(0), `${label} should be > 0 BTC`).toBe(true);
}

function hasTokenAddress(token: Token, chainId: ChainId, env: Env): boolean {
  const entry = TOKEN_ADDRESSES[token]?.[env]?.[chainId];
  return Boolean(entry);
}

runIfEnabled('Automint Fee Contract Reads', () => {
  it(
    'returns non-zero LBTC minting fee on Sepolia stage and Ethereum prod',
    async () => {
      if (hasTokenAddress(Token.LBTC, ChainId.sepolia, Env.stage)) {
        const sepoliaStageFee = await getMintingFee({
          token: Token.LBTC,
          chainId: ChainId.sepolia,
          env: Env.stage });
        expectNonZeroFee(sepoliaStageFee, 'Sepolia (stage) LBTC');
      }

      if (hasTokenAddress(Token.LBTC, ChainId.ethereum, Env.prod)) {
        const ethereumProdFee = await getMintingFee({
          token: Token.LBTC,
          chainId: ChainId.ethereum,
          env: Env.prod });
        expectNonZeroFee(ethereumProdFee, 'Ethereum (prod) LBTC');
      }
    },
    TIMEOUT,
  );

  it(
    'returns non-zero BTC.b minting fee on Sepolia stage when configured',
    async () => {
      if (!hasTokenAddress(Token.BTCb, ChainId.sepolia, Env.stage)) {
        return;
      }

      const sepoliaStageFee = await getMintingFee({
        token: Token.BTCb,
        chainId: ChainId.sepolia,
        env: Env.stage });

      expectNonZeroFee(sepoliaStageFee, 'Sepolia (stage) BTC.b');
    },
    TIMEOUT,
  );
});
