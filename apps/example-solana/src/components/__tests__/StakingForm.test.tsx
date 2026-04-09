import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AssetId, Env } from "@lombard.finance/sdk";

import { StakingForm } from "../StakingForm";

describe("Solana StakingForm", () => {
  let root: Root;
  let container: HTMLDivElement;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
  });

  function renderForm(
    props: Partial<React.ComponentProps<typeof StakingForm>> = {},
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
      root.render(<StakingForm {...defaultProps} />);
    });

    return defaultProps;
  }

  it("submits form payload with auto-filled address", async () => {
    const { onSubmit } = renderForm({
      solanaAddress: "So11111111111111111111111111111111111111112",
    });

    const form = container.querySelector("form") as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(vi.mocked(onSubmit).mock.calls[0][0]).toMatchObject({
      destAddress: "So11111111111111111111111111111111111111112",
      assetOut: AssetId.LBTC,
    });
  });

  it("alerts when submitting without destination address", async () => {
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
    const { onSubmit } = renderForm();

    const form = container.querySelector("form") as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });

    expect(alertMock).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
    alertMock.mockRestore();
  });

  it("disables submit when disabled prop is true", () => {
    renderForm({ disabled: true });

    const button = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("shows loading state when isLoading is true", () => {
    renderForm({ isLoading: true });

    const button = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain("Initializing");
  });
});
