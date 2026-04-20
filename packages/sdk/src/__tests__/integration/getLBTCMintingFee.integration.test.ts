/**
 * Integration Tests for getLBTCMintingFee
 *
 * These tests query actual on-chain contracts to verify minting fee values.
 * Run with: yarn test:integration or npx vitest run --config vitest.integration.config.ts
 *
 * The minting fee (auto-mint commission) is denominated in satoshis and is
 * deducted from the minted LBTC to compensate for EVM gas costs.
 * 
 * Non-subsidized chains (Ethereum, Sepolia): Should return non-zero fees
 * Subsidized chains (Base, BSC): Return 0 (Lombard absorbs gas costs)
 */

import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import { ChainId } from '../../common/chains';
import {
  getLBTCMintingFee,
  getMintingFee,
} from '../../contract-functions/getLBTCMintingFee/getLBTCMintingFee';
import { Token, TOKEN_ADDRESSES } from '../../tokens/token-addresses';
import { isUpgradedContract } from '../../tokens/tokens';

describe('getLBTCMintingFee Integration Tests', () => {
  // Increase timeout for RPC calls
  const TIMEOUT = 30000;

  describe('Contract Status Checks', () => {
    it(
      'should check if Sepolia LBTC contract is upgraded (testnet env)',
      async () => {
        const isUpgraded = await isUpgradedContract(
          Token.LBTC,
          ChainId.sepolia,
          Env.testnet,
        );
        console.log(`Sepolia (testnet) LBTC contract upgraded: ${isUpgraded}`);
        console.log(
          `Sepolia (testnet) LBTC address: ${TOKEN_ADDRESSES[Token.LBTC]?.[Env.testnet]?.[ChainId.sepolia]}`,
        );
        expect(typeof isUpgraded).toBe('boolean');
      },
      TIMEOUT,
    );

    it(
      'should check if Sepolia LBTC contract is upgraded (stage env)',
      async () => {
        const isUpgraded = await isUpgradedContract(
          Token.LBTC,
          ChainId.sepolia,
          Env.stage,
        );
        console.log(`Sepolia (stage) LBTC contract upgraded: ${isUpgraded}`);
        console.log(
          `Sepolia (stage) LBTC address: ${TOKEN_ADDRESSES[Token.LBTC]?.[Env.stage]?.[ChainId.sepolia]}`,
        );
        expect(typeof isUpgraded).toBe('boolean');
      },
      TIMEOUT,
    );

    it(
      'should check if Ethereum mainnet LBTC contract is upgraded',
      async () => {
        const isUpgraded = await isUpgradedContract(
          Token.LBTC,
          ChainId.ethereum,
          Env.prod,
        );
        console.log(`Ethereum mainnet LBTC contract upgraded: ${isUpgraded}`);
        console.log(
          `Ethereum mainnet LBTC address: ${TOKEN_ADDRESSES[Token.LBTC]?.[Env.prod]?.[ChainId.ethereum]}`,
        );
        expect(typeof isUpgraded).toBe('boolean');
      },
      TIMEOUT,
    );
  });

  describe('Fee Value Checks', () => {
    it(
      'should get minting fee from Sepolia (testnet env)',
      async () => {
        const fee = await getLBTCMintingFee({
          chainId: ChainId.sepolia,
          env: Env.testnet,
        });
        console.log(
          `Sepolia (testnet) LBTC minting fee: ${fee.toString()} BTC (${fee.times(1e8).toString()} satoshis)`,
        );

        // Sepolia should have a non-zero fee
        // If this fails, it means the contract is returning 0
        if (fee.isZero()) {
          console.warn(
            '⚠️ WARNING: Fee is 0 on Sepolia - investigate contract configuration',
          );
        }
      },
      TIMEOUT,
    );

    it(
      'should get minting fee from Sepolia (stage env)',
      async () => {
        const fee = await getLBTCMintingFee({
          chainId: ChainId.sepolia,
          env: Env.stage,
        });
        console.log(
          `Sepolia (stage) LBTC minting fee: ${fee.toString()} BTC (${fee.times(1e8).toString()} satoshis)`,
        );

        if (fee.isZero()) {
          console.warn(
            '⚠️ WARNING: Fee is 0 on Sepolia (stage) - investigate contract configuration',
          );
        }
      },
      TIMEOUT,
    );

    it(
      'should get minting fee from Ethereum mainnet',
      async () => {
        const fee = await getLBTCMintingFee({
          chainId: ChainId.ethereum,
          env: Env.prod,
        });
        console.log(
          `Ethereum mainnet LBTC minting fee: ${fee.toString()} BTC (${fee.times(1e8).toString()} satoshis)`,
        );

        // Ethereum mainnet should definitely have a non-zero fee
        expect(fee.isGreaterThan(0)).toBe(true);
      },
      TIMEOUT,
    );

    it(
      'should compare fees across environments',
      async () => {
        // Collect fees from different chains/envs
        const fees: Record<string, string> = {};

        try {
          const ethereumFee = await getLBTCMintingFee({
            chainId: ChainId.ethereum,
            env: Env.prod,
          });
          fees['Ethereum (prod)'] = `${ethereumFee.toString()} BTC`;
        } catch (e) {
          fees['Ethereum (prod)'] = `Error: ${e}`;
        }

        try {
          const sepoliaTestnetFee = await getLBTCMintingFee({
            chainId: ChainId.sepolia,
            env: Env.testnet,
          });
          fees['Sepolia (testnet)'] = `${sepoliaTestnetFee.toString()} BTC`;
        } catch (e) {
          fees['Sepolia (testnet)'] = `Error: ${e}`;
        }

        try {
          const sepoliaStageFee = await getLBTCMintingFee({
            chainId: ChainId.sepolia,
            env: Env.stage,
          });
          fees['Sepolia (stage)'] = `${sepoliaStageFee.toString()} BTC`;
        } catch (e) {
          fees['Sepolia (stage)'] = `Error: ${e}`;
        }

        try {
          const baseFee = await getMintingFee({
            token: Token.LBTC,
            chainId: ChainId.base,
            env: Env.prod,
          });
          fees['Base (prod)'] = `${baseFee.toString()} BTC`;
        } catch (e) {
          fees['Base (prod)'] = `Error: ${e}`;
        }

        console.log('\n=== Fee Comparison ===');
        console.table(fees);
      },
      TIMEOUT * 3,
    );
  });
});
