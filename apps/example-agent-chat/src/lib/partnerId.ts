/**
 * Partner ID resolution + UI state for the chat example app.
 *
 * The Lombard BFF maintains separate partner registries per environment:
 * - mainnet: "okx", "lombard"
 * - testnet (Sepolia / Base Sepolia): "test1" through "test10"
 *
 * A mainnet partner sent on testnet returns "partner not found", which is
 * how we discovered this bug. Resolution order:
 *
 *   localStorage override → env var → built-in default
 *
 * The override is written by the header selector so testers can switch
 * partner IDs without editing .env or reloading.
 */
import { useEffect, useState } from "react";

export const TESTNET_PARTNERS = [
  "test1",
  "test2",
  "test3",
  "test4",
  "test5",
  "test6",
  "test7",
  "test8",
  "test9",
  "test10",
] as const;

// `lombardtest1` is intentionally first so it is the default selection.
// It is a non-revenue partner ID specifically for chatbot testing on
// mainnet — `okx` and `lombard` are real partner IDs that incur fee
// payouts on every deposit and must not be used for testing.
export const MAINNET_PARTNERS = ["lombardtest1", "okx", "lombard"] as const;

export type PartnerEnv = "testnet" | "mainnet";

const STORAGE_KEY = "lombard.partnerId";
const CHANGE_EVENT = "partner-id-changed";

function storageKey(env: PartnerEnv): string {
  return `${STORAGE_KEY}.${env}`;
}

function readStored(env: PartnerEnv): string | null {
  try {
    return localStorage.getItem(storageKey(env));
  } catch {
    return null;
  }
}

function writeStored(env: PartnerEnv, value: string | null): void {
  try {
    if (value) localStorage.setItem(storageKey(env), value);
    else localStorage.removeItem(storageKey(env));
    window.dispatchEvent(
      new CustomEvent(CHANGE_EVENT, { detail: env }),
    );
  } catch {
    // localStorage unavailable; ignore
  }
}

function defaultPartnerId(env: PartnerEnv): string {
  if (env === "testnet") {
    return import.meta.env.VITE_LOMBARD_TESTNET_PARTNER_ID || "test1";
  }
  // Default to lombardtest1 on mainnet so the chatbot example never
  // routes through a revenue-generating partner ID (okx / lombard) by
  // accident. Override via VITE_LOMBARD_PARTNER_ID if you actually want
  // a production partner.
  return import.meta.env.VITE_LOMBARD_PARTNER_ID || "lombardtest1";
}

/** Reads the current partner ID synchronously. Use in non-React contexts. */
export function getPartnerId(env: PartnerEnv): string {
  return readStored(env) ?? defaultPartnerId(env);
}

/** Persists a partner ID override and notifies subscribed hooks. */
export function setPartnerId(env: PartnerEnv, value: string): void {
  writeStored(env, value);
}

/** React hook: returns [current, setter] and re-renders when changed. */
export function usePartnerId(
  env: PartnerEnv,
): [string, (value: string) => void] {
  const [value, setValue] = useState(() => getPartnerId(env));

  useEffect(() => {
    setValue(getPartnerId(env));
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === env) setValue(getPartnerId(env));
    };
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, [env]);

  return [value, (v: string) => setPartnerId(env, v)];
}
