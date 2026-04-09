/**
 * Partner configuration management
 *
 * This module handles partner-specific configuration.
 */

import type { PartnerConfig } from "../config/types";

/**
 * Partner configuration manager
 *
 * Manages partner-specific settings.
 */
export class PartnerConfiguration {
  private config: PartnerConfig | undefined;

  constructor(config?: PartnerConfig) {
    this.config = config;
  }

  /**
   * Get partner ID
   */
  getPartnerId(): string | undefined {
    return this.config?.partnerId;
  }

  /**
   * Check if partner is configured
   */
  isConfigured(): boolean {
    return this.config !== undefined;
  }

  /**
   * Update partner configuration
   *
   * @param config - New partner configuration
   */
  update(config: PartnerConfig): void {
    this.config = config;
  }

  /**
   * Clear partner configuration
   */
  clear(): void {
    this.config = undefined;
  }
}
