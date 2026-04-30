/**
 * Event definitions for all strategy types
 *
 * This module defines strongly-typed events that strategies emit
 * during their execution lifecycle.
 */

import type { StrategyProgress } from '../core/types';
import type { LombardError } from './errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Event emitter requires bivariant `any` for type-safe event handler signatures
type StrategyEventHandlerMap = Record<string, (...args: any[]) => void>;

/**
 * Stake operation events
 *
 * Emitted by all stake strategies (BTC → LBTC, etc.)
 */
export const StakeEvent = {
  /** Progress update with detailed step information */
  Progress: 'progress',

  /** Status change (e.g., 'idle' → 'preparing' → 'ready') */
  StatusChange: 'status-change',

  /** Operation completed successfully */
  Completed: 'completed',

  /** Operation failed */
  Failed: 'failed',

  /** Error occurred */
  Error: 'error' } as const;

export type StakeEvent = (typeof StakeEvent)[keyof typeof StakeEvent];

/**
 * Deposit operation events
 *
 * Emitted by all deposit strategies (EVM, etc.)
 */
export const DepositEvent = {
  Progress: 'progress',
  StatusChange: 'status-change',
  Completed: 'completed',
  Failed: 'failed',
  Error: 'error' } as const;

export type DepositEvent = (typeof DepositEvent)[keyof typeof DepositEvent];

/**
 * Redeem operation events
 *
 * Emitted by all redeem strategies (cross-chain asset redemptions)
 */
export const RedeemEvent = {
  Progress: 'progress',
  StatusChange: 'status-change',
  Completed: 'completed',
  Failed: 'failed',
  Error: 'error' } as const;

export type RedeemEvent = (typeof RedeemEvent)[keyof typeof RedeemEvent];

/**
 * Unstake operation events
 *
 * Emitted by all unstake strategies (LBTC → BTC or BTC.b)
 */
export const UnstakeEvent = {
  Progress: 'progress',
  StatusChange: 'status-change',
  Completed: 'completed',
  Failed: 'failed',
  Error: 'error' } as const;

export type UnstakeEvent = (typeof UnstakeEvent)[keyof typeof UnstakeEvent];

/**
 * Deploy operation events
 *
 * Emitted by deploy strategies (deploying L-Assets to DeFi protocols)
 */
export const DeployEvent = {
  Progress: 'progress',
  StatusChange: 'status-change',
  Completed: 'completed',
  Failed: 'failed',
  Error: 'error' } as const;

export type DeployEvent = (typeof DeployEvent)[keyof typeof DeployEvent];

/**
 * Withdraw operation events
 *
 * Emitted by withdraw strategies (withdrawing vault shares from DeFi protocols)
 */
export const WithdrawEvent = {
  Progress: 'progress',
  StatusChange: 'status-change',
  Completed: 'completed',
  Failed: 'failed',
  Error: 'error' } as const;

export type WithdrawEvent = (typeof WithdrawEvent)[keyof typeof WithdrawEvent];

/**
 * Bridge operation events
 *
 * Emitted by bridge strategies (cross-chain L-Asset transfers)
 */
export const BridgeEvent = {
  Progress: 'progress',
  StatusChange: 'status-change',
  Completed: 'completed',
  Failed: 'failed',
  Error: 'error' } as const;

export type BridgeEvent = (typeof BridgeEvent)[keyof typeof BridgeEvent];

/**
 * StakeAndDeploy operation events ("Stake and Bake")
 *
 * Emitted by stake-and-deploy strategies (BTC → LBTC → Vault in one operation)
 */
export const StakeAndDeployEvent = {
  Progress: 'progress',
  StatusChange: 'status-change',
  Completed: 'completed',
  Failed: 'failed',
  Error: 'error' } as const;

export type StakeAndDeployEvent =
  (typeof StakeAndDeployEvent)[keyof typeof StakeAndDeployEvent];

/**
 * DepositAndDeploy operation events
 *
 * Emitted by deposit-and-deploy strategies (BTC → BTC.b → Vault in one operation)
 * Similar to StakeAndDeploy but produces BTC.b instead of LBTC.
 */
export const DepositAndDeployEvent = {
  Progress: 'progress',
  StatusChange: 'status-change',
  Completed: 'completed',
  Failed: 'failed',
  Error: 'error' } as const;

export type DepositAndDeployEvent =
  (typeof DepositAndDeployEvent)[keyof typeof DepositAndDeployEvent];

/**
 * Event handler type mapping for stake operations
 */
export interface StakeEventMap extends StrategyEventHandlerMap {
  [StakeEvent.Progress]: (progress: StrategyProgress<string>) => void;
  [StakeEvent.StatusChange]: (status: string) => void;
  [StakeEvent.Completed]: () => void;
  [StakeEvent.Failed]: () => void;
  [StakeEvent.Error]: (error: LombardError) => void;
}

/**
 * Event handler type mapping for deposit operations
 */
export interface DepositEventMap extends StrategyEventHandlerMap {
  [DepositEvent.Progress]: (progress: StrategyProgress<string>) => void;
  [DepositEvent.StatusChange]: (status: string) => void;
  [DepositEvent.Completed]: () => void;
  [DepositEvent.Failed]: () => void;
  [DepositEvent.Error]: (error: LombardError) => void;
}

/**
 * Event handler type mapping for redeem operations
 */
export interface RedeemEventMap extends StrategyEventHandlerMap {
  [RedeemEvent.Progress]: (progress: StrategyProgress<string>) => void;
  [RedeemEvent.StatusChange]: (status: string) => void;
  [RedeemEvent.Completed]: () => void;
  [RedeemEvent.Failed]: () => void;
  [RedeemEvent.Error]: (error: LombardError) => void;
}

/**
 * Event handler type mapping for unstake operations
 */
export interface UnstakeEventMap extends StrategyEventHandlerMap {
  [UnstakeEvent.Progress]: (progress: StrategyProgress<string>) => void;
  [UnstakeEvent.StatusChange]: (status: string) => void;
  [UnstakeEvent.Completed]: () => void;
  [UnstakeEvent.Failed]: () => void;
  [UnstakeEvent.Error]: (error: LombardError) => void;
}

/**
 * Event handler type mapping for deploy operations
 */
export interface DeployEventMap extends StrategyEventHandlerMap {
  [DeployEvent.Progress]: (progress: StrategyProgress<string>) => void;
  [DeployEvent.StatusChange]: (status: string) => void;
  [DeployEvent.Completed]: () => void;
  [DeployEvent.Failed]: () => void;
  [DeployEvent.Error]: (error: LombardError) => void;
}

/**
 * Event handler type mapping for withdraw operations
 */
export interface WithdrawEventMap extends StrategyEventHandlerMap {
  [WithdrawEvent.Progress]: (progress: StrategyProgress<string>) => void;
  [WithdrawEvent.StatusChange]: (status: string) => void;
  [WithdrawEvent.Completed]: () => void;
  [WithdrawEvent.Failed]: () => void;
  [WithdrawEvent.Error]: (error: LombardError) => void;
}

/**
 * Event handler type mapping for bridge operations
 */
export interface BridgeEventMap extends StrategyEventHandlerMap {
  [BridgeEvent.Progress]: (progress: StrategyProgress<string>) => void;
  [BridgeEvent.StatusChange]: (status: string) => void;
  [BridgeEvent.Completed]: () => void;
  [BridgeEvent.Failed]: () => void;
  [BridgeEvent.Error]: (error: LombardError) => void;
}

/**
 * Event handler type mapping for stake-and-deploy operations
 */
export interface StakeAndDeployEventMap extends StrategyEventHandlerMap {
  [StakeAndDeployEvent.Progress]: (progress: StrategyProgress<string>) => void;
  [StakeAndDeployEvent.StatusChange]: (status: string) => void;
  [StakeAndDeployEvent.Completed]: () => void;
  [StakeAndDeployEvent.Failed]: () => void;
  [StakeAndDeployEvent.Error]: (error: LombardError) => void;
}

/**
 * Event handler type mapping for deposit-and-deploy operations
 */
export interface DepositAndDeployEventMap extends StrategyEventHandlerMap {
  [DepositAndDeployEvent.Progress]: (
    progress: StrategyProgress<string>,
  ) => void;
  [DepositAndDeployEvent.StatusChange]: (status: string) => void;
  [DepositAndDeployEvent.Completed]: () => void;
  [DepositAndDeployEvent.Failed]: () => void;
  [DepositAndDeployEvent.Error]: (error: LombardError) => void;
}

/**
 * Generic event map type for any strategy
 */
export type StrategyEventMap =
  | StakeEventMap
  | DepositEventMap
  | RedeemEventMap
  | UnstakeEventMap
  | DeployEventMap
  | WithdrawEventMap
  | BridgeEventMap
  | StakeAndDeployEventMap
  | DepositAndDeployEventMap;

/**
 * Generic event type for any strategy
 */
export type StrategyEvent =
  | StakeEvent
  | DepositEvent
  | RedeemEvent
  | UnstakeEvent
  | DeployEvent
  | WithdrawEvent
  | BridgeEvent
  | StakeAndDeployEvent
  | DepositAndDeployEvent;
