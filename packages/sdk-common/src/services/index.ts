/**
 * Chain Services
 *
 * Interfaces for what modules provide to actions.
 * Each chain module (btcModule, evmModule, solanaModule, etc.)
 * returns a service implementing one of these interfaces.
 *
 * Service-First Pattern:
 * - Service interfaces define the contract
 * - Service implementation classes contain the logic
 * - Modules are thin factories that instantiate services
 */

// Core services (provided by sdk)
export * from "./api";
export * from "./btc";
export * from "./evm";

// External chain services (provided by sdk-solana, sdk-sui, etc.)
export * from "./solana";
export * from "./starknet";
export * from "./sui";
