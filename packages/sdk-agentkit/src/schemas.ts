/**
 * Zod Schemas for Lombard AgentKit Actions
 *
 * Each schema includes `.describe()` annotations that serve as
 * instructions for the LLM to understand what data to collect
 * from the user.
 *
 * @module schemas
 */

import { MIN_STAKE_AMOUNT_BTC } from '@lombard.finance/sdk';
import { z } from 'zod';

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

// ═══════════════════════════════════════════════════════════════════════════
// Stake: BTC.b → LBTC
// ═══════════════════════════════════════════════════════════════════════════

export const StakeSchema = z
  .object({
    amount: z
      .string()
      .refine((v) => Number(v) >= MIN_STAKE_AMOUNT_BTC, {
        message: `Amount must be at least ${MIN_STAKE_AMOUNT_BTC} BTC.b`,
      })
      .describe(
        `The amount of BTC.b to stake, in whole units (e.g. "0.5" for 0.5 BTC.b). ` +
          `Minimum amount is ${MIN_STAKE_AMOUNT_BTC} BTC.b. ` +
          'BTC.b is wrapped Bitcoin on EVM chains. Staking converts it to LBTC, ' +
          "Lombard's liquid staked Bitcoin that earns native BTC yield.",
      ),
  })
  .strip()
  .describe('Stake BTC.b to receive LBTC (Lombard liquid staked Bitcoin)');

// ═══════════════════════════════════════════════════════════════════════════
// Unstake: LBTC → BTC.b
// ═══════════════════════════════════════════════════════════════════════════

export const UnstakeSchema = z
  .object({
    amount: z
      .string()
      .describe('The amount of LBTC to unstake, in whole units (e.g. "1.0")'),
    recipient: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM address format')
      .describe(
        'The EVM address (0x…) that will receive the BTC.b tokens',
      ),
  })
  .strip()
  .describe('Unstake LBTC to receive BTC.b on the same EVM chain');

// ═══════════════════════════════════════════════════════════════════════════
// Deposit: BTC.b → LBTC
// ═══════════════════════════════════════════════════════════════════════════

export const DepositSchema = z
  .object({
    amount: z
      .string()
      .describe(
        'The amount of BTC.b to deposit, in whole units (e.g. "0.25")',
      ),
    recipient: z
      .string()
      .regex(EVM_ADDRESS_RE, 'Invalid EVM address format')
      .describe('The EVM address (0x…) that will receive the minted LBTC'),
  })
  .strip()
  .describe('Deposit BTC.b to receive LBTC');

// ═══════════════════════════════════════════════════════════════════════════
// Redeem: BTC.b → BTC
// ═══════════════════════════════════════════════════════════════════════════

export const RedeemSchema = z
  .object({
    amount: z
      .string()
      .describe('The amount of BTC.b to redeem, in whole units (e.g. "0.1")'),
    recipient: z
      .string()
      .describe(
        'A Bitcoin address (bc1q… or bc1p…) to receive the native BTC',
      ),
  })
  .strip()
  .describe(
    'Redeem BTC.b to receive native BTC on the Bitcoin network (cross-chain)',
  );

// ═══════════════════════════════════════════════════════════════════════════
// Deploy: LBTC → DeFi Protocol
// ═══════════════════════════════════════════════════════════════════════════

export const DeploySchema = z
  .object({
    amount: z
      .string()
      .describe(
        'The amount of LBTC to deploy into the DeFi protocol, in whole units (e.g. "0.5")',
      ),
    protocol: z
      .enum(['veda', 'silo'])
      .describe(
        'The DeFi protocol to deploy to. ' +
          '"veda" — Veda vault (available on Ethereum, Base, BSC, Corn). ' +
          '"silo" — Silo lending (available on Avalanche).',
      ),
  })
  .strip()
  .describe(
    'Deploy LBTC into a DeFi protocol (Veda or Silo) to earn additional yield',
  );
