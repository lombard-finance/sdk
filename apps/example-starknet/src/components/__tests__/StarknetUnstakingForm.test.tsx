import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AssetId, Chain, Env } from "@lombard.finance/sdk";

import { StarknetUnstakingForm } from "../StarknetUnstakingForm";

describe("StarknetUnstakingForm", () => {
  let root: Root;
  let container: HTMLDivElement;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
  });

  function renderForm(
    props: Partial<React.ComponentProps<typeof StarknetUnstakingForm>> = {},
  ) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    const defaultProps = {
      onSubmit: vi.fn().mockResolvedValue(undefined),
      isSubmitting: false,
      env: Env.stage,
      ...props,
    };

    act(() => {
      root.render(<StarknetUnstakingForm {...defaultProps} />);
    });

    return defaultProps;
  }

  it("submits unstake payload with correct asset types", async () => {
    const { onSubmit } = renderForm();

    // Fill in recipient field
    const recipientInput = container.querySelector(
      "#recipient",
    ) as HTMLInputElement;
    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeInputValueSetter?.call(recipientInput, "bc1qtest");
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
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTC,
    });
  });

  it("uses testnet chains for non-prod environments", async () => {
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
      sourceChain: Chain.STARKNET_SEPOLIA,
      destChain: Chain.BITCOIN_SIGNET,
    });
  });

  it("uses mainnet chains for prod environment", async () => {
    const { onSubmit } = renderForm({ env: Env.prod });

    // Fill recipient
    const recipientInput = container.querySelector(
      "#recipient",
    ) as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(recipientInput, "bc1qtest");
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
      sourceChain: Chain.STARKNET_MAINNET,
      destChain: Chain.BITCOIN_MAINNET,
    });
  });

  it("disables submit button when isSubmitting is true", () => {
    renderForm({ isSubmitting: true });

    const button = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe("Processing...");
  });

  it("displays correct chain labels for non-prod env", () => {
    renderForm({ env: Env.testnet });

    const sourceInput = container.querySelector(
      "#sourceChain",
    ) as HTMLInputElement;
    const destInput = container.querySelector("#destChain") as HTMLInputElement;
    expect(sourceInput.value).toBe("Starknet Sepolia");
    expect(destInput.value).toBe("Bitcoin Signet");
  });

  it("displays correct chain labels for prod env", () => {
    renderForm({ env: Env.prod });

    const sourceInput = container.querySelector(
      "#sourceChain",
    ) as HTMLInputElement;
    const destInput = container.querySelector("#destChain") as HTMLInputElement;
    expect(sourceInput.value).toBe("Starknet Mainnet");
    expect(destInput.value).toBe("Bitcoin Mainnet");
  });
});
