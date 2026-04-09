import { describe, expect, it, vi } from "vitest";

import { BaseAction } from "../../../shared/actions/BaseAction";

// Mock event handler types
type TestEventMap = {
  // BaseAction requires handlers to be compatible with EventHandler<unknown[]>
  // (i.e., handlers must accept unknown[] args). We cast inside tests as needed.
  "status-change": (...args: unknown[]) => void;
  loading: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  failed: (...args: unknown[]) => void;
  completed: (...args: unknown[]) => void;
};

// Concrete implementation for testing
class TestAction extends BaseAction<TestEventMap, string> {
  constructor(initialStatus: string = "idle") {
    super(initialStatus);
  }

  // Expose protected methods for testing
  public testUpdateStatus(status: string) {
    this.updateStatus(status);
  }

  public testAssertStatus(expected: string | string[], action: string) {
    this.assertStatus(expected, action);
  }

  public async testAct<T>(fn: () => Promise<T>, successStatus?: string) {
    return this.act(fn, successStatus);
  }
}

describe("BaseAction", () => {
  it("should initialize with correct status", () => {
    const action = new TestAction("idle");
    expect(action.status).toBe("idle");
    expect(action.isLoading).toBe(false);
    expect(action.error).toBeNull();
    expect(action.isFailed).toBe(false);
  });

  describe("act() Pattern", () => {
    it("should set isLoading=true during operation", async () => {
      const action = new TestAction();
      const loadingStates: boolean[] = [];
      action.on("loading", (...args) => loadingStates.push(args[0] as boolean));

      await action.testAct(async () => {
        expect(action.isLoading).toBe(true);
      });

      expect(loadingStates).toEqual([true, false]);
      expect(action.isLoading).toBe(false);
    });

    it("should update status on success if provided", async () => {
      const action = new TestAction("idle");

      await action.testAct(async () => {
        // do work
      }, "ready");

      expect(action.status).toBe("ready");
    });

    it("should NOT update status if successStatus not provided", async () => {
      const action = new TestAction("idle");

      await action.testAct(async () => {
        // do work
      });

      expect(action.status).toBe("idle");
    });

    it("should preserve status on error (no rollback to FAILED)", async () => {
      const action = new TestAction("idle");
      const initialStatus = action.status;
      const error = new Error("Something went wrong");

      await expect(
        action.testAct(async () => {
          throw error;
        }),
      ).rejects.toThrow();

      expect(action.status).toBe(initialStatus); // Status unchanged
      expect(action.isFailed).toBe(true); // Error flag set
      expect(action.error).not.toBeNull(); // Error captured
    });

    it("should emit error and failed events on failure", async () => {
      const action = new TestAction();
      const errorFn = vi.fn();
      const failedFn = vi.fn();
      action.on("error", errorFn);
      action.on("failed", failedFn);

      await expect(
        action.testAct(async () => {
          throw new Error("Boom");
        }),
      ).rejects.toThrow("Boom");

      expect(errorFn).toHaveBeenCalled();
      expect(failedFn).toHaveBeenCalled();
    });
  });

  describe("Status assertions", () => {
    it("should allow allowed statuses", () => {
      const action = new TestAction("idle");
      expect(() => action.testAssertStatus("idle", "test")).not.toThrow();
      expect(() =>
        action.testAssertStatus(["idle", "ready"], "test"),
      ).not.toThrow();
    });

    it("should throw on disallowed statuses", () => {
      const action = new TestAction("idle");
      expect(() => action.testAssertStatus("ready", "test")).toThrow();
    });
  });
});
