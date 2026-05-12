/**
 * Shared validation helpers for prepare_* tools.
 *
 * The agent must validate inputs against SDK constraints (minimums, address
 * formats, required fields) BEFORE constructing a transaction. Tools return
 * a structured ValidationFailure when checks fail so the LLM can surface
 * the missing or invalid fields to the user and ask, instead of producing
 * an executable card with bad data.
 */
import {
  Env,
  MIN_REDEEM_AMOUNT_BTC,
  MIN_STAKE_AMOUNT_BTC,
} from "@lombard.finance/sdk";

/**
 * Chain IDs the SDK treats as testnet for BTC address validation.
 * Keep in sync with the agent's chain config.
 */
const TESTNET_CHAIN_IDS = new Set<number>([
  11155111, // ethereum sepolia
  84532, // base sepolia
]);

const MAINNET_BTC_REGEX =
  /^(bc1[a-z0-9]{39,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/;
const TESTNET_BTC_REGEX =
  /^(tb1[a-z0-9]{39,87}|[mn2][a-km-zA-HJ-NP-Z1-9]{25,34})$/;

/**
 * Verifies that a string looks like a Bitcoin address for the network
 * implied by the EVM chain the user is on. Format check only; does NOT
 * validate the base58/bech32 checksum.
 */
export function isBitcoinAddress(addr: string, evmChainId: number): boolean {
  if (typeof addr !== "string") return false;
  const trimmed = addr.trim();
  if (trimmed.length === 0) return false;
  return TESTNET_CHAIN_IDS.has(evmChainId)
    ? TESTNET_BTC_REGEX.test(trimmed)
    : MAINNET_BTC_REGEX.test(trimmed);
}

/** Verifies a string parses as a positive numeric amount. */
export function isPositiveAmount(amount: unknown): amount is string {
  if (typeof amount !== "string") return false;
  if (!/^\d+(\.\d+)?$/.test(amount)) return false;
  const n = Number(amount);
  return Number.isFinite(n) && n > 0;
}

/**
 * Structured validation failure surfaced to the LLM as a tool result.
 * `missing` lists field names the LLM should re-prompt the user for.
 * `errors` lists field-level problems (invalid format, below minimum, etc).
 * `note` is a single-sentence instruction for the LLM (what to do next).
 */
export interface ValidationFailure {
  valid: false;
  missing: string[];
  errors: string[];
  note: string;
}

/** Tags a successful validation; spread alongside tool-specific output. */
export interface ValidationSuccess {
  valid: true;
}

export type ValidationResult = ValidationFailure | ValidationSuccess;

/**
 * Validates the inputs to prepare_unstake. Asks for a Bitcoin recipient
 * when outputAsset is "BTC" and checks the format against the network.
 */
export function validateUnstakeInputs(params: {
  amount: unknown;
  outputAsset: unknown;
  recipient?: unknown;
  chainId: number;
}): ValidationResult {
  const missing: string[] = [];
  const errors: string[] = [];

  if (!isPositiveAmount(params.amount)) {
    errors.push(
      "amount must be a positive numeric string (e.g. '0.5')",
    );
  } else if (Number(params.amount) < MIN_REDEEM_AMOUNT_BTC) {
    errors.push(
      `amount ${params.amount} is below the protocol minimum of ${MIN_REDEEM_AMOUNT_BTC} LBTC. Network fees may push the practical minimum higher; ask the user to confirm a value at or above ${MIN_REDEEM_AMOUNT_BTC}.`,
    );
  }

  if (params.outputAsset !== "BTC" && params.outputAsset !== "BTCb") {
    errors.push("outputAsset must be either 'BTC' or 'BTCb'");
  }

  if (params.outputAsset === "BTC") {
    if (typeof params.recipient !== "string" || params.recipient.length === 0) {
      missing.push("recipient");
    } else if (!isBitcoinAddress(params.recipient, params.chainId)) {
      errors.push(
        "recipient is not a valid Bitcoin address for this network. Mainnet: bc1.../1.../3...; Sepolia/testnet: tb1.../m.../n.../2...",
      );
    }
  }

  if (missing.length === 0 && errors.length === 0) {
    return { valid: true };
  }

  const noteParts: string[] = [];
  if (missing.length > 0) {
    noteParts.push(
      `Ask the user for: ${missing.join(", ")}. Do not infer these values from prior context.`,
    );
  }
  if (errors.length > 0) {
    noteParts.push(
      "Surface the listed errors to the user and re-prompt; do not retry the tool with the same arguments.",
    );
  }

  return {
    valid: false,
    missing,
    errors,
    note: noteParts.join(" "),
  };
}

/** Validates the inputs to prepare_stake (BTC.b → LBTC). */
export function validateStakeInputs(params: {
  amount: unknown;
}): ValidationResult {
  const errors: string[] = [];

  if (!isPositiveAmount(params.amount)) {
    errors.push("amount must be a positive numeric string (e.g. '0.5')");
  } else if (Number(params.amount) < MIN_STAKE_AMOUNT_BTC) {
    errors.push(
      `amount ${params.amount} is below the protocol minimum of ${MIN_STAKE_AMOUNT_BTC} BTC.`,
    );
  }

  if (errors.length === 0) return { valid: true };
  return {
    valid: false,
    missing: [],
    errors,
    note: "Surface the listed errors to the user and re-prompt; do not retry the tool with the same arguments.",
  };
}

/**
 * Validates the inputs to prepare_redeem_btcb (BTC.b -> native BTC).
 * BTC.b has its own minimum-redeem floor today (same MIN_REDEEM_AMOUNT_BTC
 * as LBTC); kept here so the agent can advertise it without an extra
 * round trip.
 */
export function validateRedeemBtcbInputs(params: {
  amount: unknown;
  recipient: unknown;
  chainId: number;
}): ValidationResult {
  const missing: string[] = [];
  const errors: string[] = [];

  if (!isPositiveAmount(params.amount)) {
    errors.push("amount must be a positive numeric string (e.g. '0.001')");
  } else if (Number(params.amount) < MIN_REDEEM_AMOUNT_BTC) {
    errors.push(
      `amount ${params.amount} is below the protocol minimum of ${MIN_REDEEM_AMOUNT_BTC} BTC. Network fees may push the practical minimum higher.`,
    );
  }

  if (typeof params.recipient !== "string" || params.recipient.length === 0) {
    missing.push("recipient");
  } else if (!isBitcoinAddress(params.recipient, params.chainId)) {
    errors.push(
      "recipient is not a valid Bitcoin address for this network. Mainnet: bc1.../1.../3...; Sepolia/testnet: tb1.../m.../n.../2...",
    );
  }

  if (missing.length === 0 && errors.length === 0) return { valid: true };

  const noteParts: string[] = [];
  if (missing.length > 0) {
    noteParts.push(
      `Ask the user for: ${missing.join(", ")}. Do not infer these values from prior context.`,
    );
  }
  if (errors.length > 0) {
    noteParts.push(
      "Surface the listed errors to the user and re-prompt; do not retry the tool with the same arguments.",
    );
  }

  return {
    valid: false,
    missing,
    errors,
    note: noteParts.join(" "),
  };
}

/** Validates the inputs to prepare_deploy_to_vault / prepare_vault_withdrawal. */
export function validateAmountInputs(params: {
  amount: unknown;
}): ValidationResult {
  if (!isPositiveAmount(params.amount)) {
    return {
      valid: false,
      missing: [],
      errors: ["amount must be a positive numeric string (e.g. '0.5')"],
      note: "Surface the listed errors to the user and re-prompt; do not retry the tool with the same arguments.",
    };
  }
  return { valid: true };
}

/**
 * Resolves the partner ID used for BTC deposit address generation.
 *
 * Testnet and mainnet have separate partner registries on the BFF, so the
 * same partner string is rarely registered on both. On testnet we always
 * use a testnet-specific partner ID (default `test1`, overridable via
 * LOMBARD_TESTNET_PARTNER_ID) regardless of what's configured for prod —
 * otherwise a mainnet partner like "okx" leaks into testnet calls and the
 * BFF returns "partner not found". On prod we use LOMBARD_PARTNER_ID and
 * fall back to undefined, which forces the SDK into the captcha path.
 */
export function resolvePartnerId(
  env: Env,
  configured?: { mainnet?: string; testnet?: string },
): string | undefined {
  const mainnet = configured?.mainnet ?? process.env.LOMBARD_PARTNER_ID;
  const testnet =
    configured?.testnet ?? process.env.LOMBARD_TESTNET_PARTNER_ID ?? "test1";
  return env === Env.testnet ? testnet : mainnet;
}
