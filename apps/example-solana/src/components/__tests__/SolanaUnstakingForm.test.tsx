import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Chain, Env } from "@lombard.finance/sdk";

import { SolanaUnstakingForm } from "../SolanaUnstakingForm";

describe("SolanaUnstakingForm", () => {
  let root: Root;
  let container: HTMLDivElement;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
  });

  function renderForm(
    props: Partial<React.ComponentProps<typeof SolanaUnstakingForm>> = {},
  ) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    const defaultProps = {
      env: Env.stage,
      onSubmit: vi.fn().mockResolvedValue(undefined),
      isLoading: false,
      ...props,
    };

    act(() => {
      root.render(<SolanaUnstakingForm {...defaultProps} />);
    });

    return defaultProps;
  }

  it("validates recipient before submit", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const { onSubmit } = renderForm();

    const form = container.querySelector("form") as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      "Please enter Bitcoin recipient address",
    );
    alertSpy.mockRestore();
  });

  it("uses devnet chains for non-prod environments", () => {
    renderForm({ env: Env.testnet });

    const sourceInput = container.querySelector(
      "#sourceChain",
    ) as HTMLInputElement;
    const destInput = container.querySelector("#destChain") as HTMLInputElement;
    expect(sourceInput.value).toBe("Solana Devnet");
    expect(destInput.value).toBe("Bitcoin Signet (Testnet)");
  });

  it("uses mainnet chains for prod environment", () => {
    renderForm({ env: Env.prod });

    const sourceInput = container.querySelector(
      "#sourceChain",
    ) as HTMLInputElement;
    const destInput = container.querySelector("#destChain") as HTMLInputElement;
    expect(sourceInput.value).toBe("Solana Mainnet");
    expect(destInput.value).toBe("Bitcoin Mainnet");
  });

  it("disables inputs when loading", () => {
    renderForm({ isLoading: true });

    const amountInput = container.querySelector("#amount") as HTMLInputElement;
    const recipientInput = container.querySelector(
      "#recipient",
    ) as HTMLInputElement;
    expect(amountInput.disabled).toBe(true);
    expect(recipientInput.disabled).toBe(true);
  });

  it("submits correct chain IDs for stage env", async () => {
    const { onSubmit } = renderForm({ env: Env.stage });

    // Fill recipient
    const recipientInput = container.querySelector(
      "#recipient",
    ) as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(recipientInput, "tb1qtest");
      recipientInput.dispatchEvent(new Event("input", { bubbles: true }));
      recipientInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const form = container.querySelector("form") as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(vi.mocked(onSubmit).mock.calls[0][0]).toMatchObject({
      sourceChain: Chain.SOLANA_DEVNET,
      destChain: Chain.BITCOIN_SIGNET,
    });
  });
});
