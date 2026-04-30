/**
 * Configuration validation and defaults
 *
 * This module provides validation and default application for SDK configuration.
 */

import { LombardError } from '../shared/errors';
import type { CreateConfigOptions, LombardConfig } from './types';

/**
 * Normalized options after validation (before modules/logger are added)
 * @internal
 */
export type NormalizedOptions = Omit<LombardConfig, 'modules' | 'logger'>;

/**
 * Validate and apply defaults to SDK options
 *
 * @param options - User-provided SDK options
 * @returns Validated and normalized options (catalog added separately)
 * @throws LombardError if configuration is invalid
 * @internal
 */
export function validateAndApplyDefaults(
  options: CreateConfigOptions,
): NormalizedOptions {
  // Validate environment
  if (!options.env) {
    throw LombardError.missingParameter('env');
  }

  // Build normalized options with defaults
  const normalized: NormalizedOptions = {
    env: options.env,
    providers: options.providers || {} };

  // Add partner config if provided
  if (options.partner) {
    validatePartnerConfig(options.partner);
    normalized.partner = options.partner;
  }

  return normalized;
}

/**
 * Validate partner configuration
 *
 * @param partner - Partner configuration to validate
 * @throws LombardError if configuration is invalid
 */
function validatePartnerConfig(partner: unknown): void {
  if (typeof partner !== 'object' || partner === null) {
    throw LombardError.invalidConfiguration(
      'Partner configuration must be an object',
    );
  }

  const config = partner as { partnerId?: string };

  if (!config.partnerId || typeof config.partnerId !== 'string') {
    throw LombardError.missingParameter('partner.partnerId');
  }

  if (config.partnerId.trim().length === 0) {
    throw LombardError.invalidConfiguration('Partner ID cannot be empty');
  }
}
