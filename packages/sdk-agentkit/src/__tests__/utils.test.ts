import { describe, expect, it } from "vitest";

import { formatError, formatSuccess } from "../utils";

describe("formatSuccess", () => {
  it("returns JSON with success=true", () => {
    const result = formatSuccess("test_action", { txHash: "0xabc" });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("test_action");
    expect(parsed.txHash).toBe("0xabc");
  });

  it("includes all detail fields", () => {
    const result = formatSuccess("deploy", {
      amount: "0.1",
      asset: "LBTC",
    });
    const parsed = JSON.parse(result);
    expect(parsed.amount).toBe("0.1");
    expect(parsed.asset).toBe("LBTC");
  });
});

describe("formatError", () => {
  it("returns JSON with success=false for Error objects", () => {
    const result = formatError("test_action", new Error("something failed"));
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.action).toBe("test_action");
    expect(parsed.error).toBe("something failed");
  });

  it("handles string errors", () => {
    const result = formatError("test_action", "network timeout");
    const parsed = JSON.parse(result);
    expect(parsed.error).toBe("network timeout");
  });

  it("handles non-string/non-Error values", () => {
    const result = formatError("test_action", 42);
    const parsed = JSON.parse(result);
    expect(parsed.error).toBe("42");
  });

  it("redacts RPC URLs from Error messages", () => {
    const result = formatError(
      "test_action",
      new Error("call to https://mainnet.infura.io/v3/abc123 failed"),
    );
    const parsed = JSON.parse(result);
    expect(parsed.error).toBe("call to [redacted-url] failed");
    expect(parsed.error).not.toContain("infura");
  });

  it("redacts long hex data from Error messages", () => {
    const longHex =
      "0x" + "a".repeat(64);
    const result = formatError(
      "test_action",
      new Error(`revert ${longHex}`),
    );
    const parsed = JSON.parse(result);
    expect(parsed.error).toBe("revert [redacted-data]");
    expect(parsed.error).not.toContain(longHex);
  });

  it("does not redact short hex strings", () => {
    const result = formatError(
      "test_action",
      new Error("invalid address 0xabcdef"),
    );
    const parsed = JSON.parse(result);
    expect(parsed.error).toBe("invalid address 0xabcdef");
  });
});
