/**
 * Shared Validation Utilities for BTC Actions
 *
 * Provides common validation logic used across all BTC actions.
 * Reduces code duplication and ensures consistent error handling.
 *
 * @module chains/btc/actions/shared/validation
 */

import type { Env } from '@lombard.finance/sdk-common';

import type { AssetId, Chain } from '../../../../core';
import { LombardError, ValidationErrorCode } from '../../../../shared/errors';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Common config interface for validation
 * All BTC action configs should implement these properties
 */
export interface ValidatableConfig {
  destChains: Chain[];
  supportedAssetsOut: AssetId[];
  routes: Array<{
    sourceChains: Chain[];
    envs: Env[];
  }>;
}

/**
 * Common params interface for validation
 */
export interface ValidatableParams {
  assetOut: AssetId;
  destChain: Chain;
  sourceChain?: Chain;
}

/**
 * Validation context
 */
export interface ValidationContext {
  env: Env;
  actionName: string;
  expectedAssets: AssetId[];
  /**
   * What to do instead, named in the error. Since 6.0.0 the routes are reached
   * by asset rather than by class, so this reads best as the parameter to
   * change — `assetOut: AssetId.BTCb` — not as another action to construct.
   */
  alternativeAction?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Validation Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if an asset is in the supported list
 */
export function isAssetSupported(
  supportedAssets: AssetId[],
  assetOut: AssetId,
): boolean {
  return supportedAssets.includes(assetOut);
}

/**
 * Check if a destination chain is in the supported list
 */
export function isDestChainSupported(
  supportedChains: Chain[],
  destChain: Chain,
): boolean {
  return supportedChains.includes(destChain);
}

/**
 * Check if a route is available for the given source chain and environment
 */
export function isRouteAvailable(
  routes: ValidatableConfig['routes'],
  sourceChain: Chain | undefined,
  env: Env,
): boolean {
  if (!sourceChain) return true; // No source chain specified, allow all

  return routes.some(
    (route) =>
      route.sourceChains.includes(sourceChain) && route.envs.includes(env),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Combined Validation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate common BTC action parameters
 *
 * Performs all standard validations in one call:
 * - Asset output validation
 * - Destination chain validation
 * - Route availability validation
 *
 * Throws descriptive errors if validation fails.
 *
 * @param config - Action configuration with supported chains/assets
 * @param params - Action parameters to validate
 * @param context - Validation context (env, action name, etc.)
 *
 * @throws LombardError with appropriate code and message
 *
 * @example
 * ```typescript
 * validateBtcActionParams(
 *   depositConfig,
 *   { assetOut: AssetId.LBTC, destChain: Chain.ETHEREUM },
 *   {
 *     env: 'prod',
 *     actionName: 'BTC deposit',
 *     expectedAssets: [AssetId.BTCb],
 *     alternativeAction: 'assetOut: AssetId.BTCb',
 *   }
 * );
 * ```
 */
export function validateBtcActionParams(
  config: ValidatableConfig,
  params: ValidatableParams,
  context: ValidationContext,
): void {
  // 1. Validate asset output
  if (!isAssetSupported(config.supportedAssetsOut, params.assetOut)) {
    const supported = config.supportedAssetsOut.join(', ');
    const alternative = context.alternativeAction
      ? ` Use ${context.alternativeAction} instead.`
      : '';

    throw new LombardError(
      ValidationErrorCode.INVALID_ASSET,
      `Asset ${params.assetOut} is not supported for ${context.actionName}. ` +
        `Supported: ${supported}.${alternative}`,
    );
  }

  // 2. Validate destination chain
  if (!isDestChainSupported(config.destChains, params.destChain)) {
    throw new LombardError(
      ValidationErrorCode.INVALID_CHAIN,
      `Destination chain ${params.destChain} is not supported for ${context.actionName}`,
    );
  }

  // 3. Validate route availability
  if (!isRouteAvailable(config.routes, params.sourceChain, context.env)) {
    throw LombardError.routeNotFound({
      assetOut: params.assetOut,
      sourceChain: params.sourceChain,
      destChain: params.destChain,
      env: context.env,
    });
  }
}

/**
 * Validate protocol is supported (for deploy actions)
 *
 * @param supportedProtocols - List of supported protocols
 * @param protocol - Protocol to validate
 * @param actionName - Name of action for error message
 */
export function validateProtocol(
  supportedProtocols: string[],
  protocol: string,
  actionName: string,
): void {
  if (!supportedProtocols.includes(protocol)) {
    throw new LombardError(
      ValidationErrorCode.INVALID_PARAMETER,
      `Protocol ${protocol} is not supported for ${actionName}. ` +
        `Supported: ${supportedProtocols.join(', ')}`,
    );
  }
}
