import React from "react";

import { Spinner } from "../Spinner";

export interface ButtonProps {
  disabled?: boolean;
  children?: React.ReactNode;
  primary?: boolean;
  size?: "small" | "medium" | "large";
  isLoading?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  fullWidth?: boolean;
  actionName?: string;
}

/**
 * Primary UI component for user interaction
 */
export const Button = ({
  primary = true,
  size = "medium",
  fullWidth = false,
  children,
  actionName,
  isLoading,
  ...props
}: ButtonProps) => {
  const label = actionName ? (
    <span>
      Execute: <span style={{ fontFamily: "monospace" }}>{actionName}</span>
    </span>
  ) : (
    children
  );

  return (
    <button
      type="button"
      className={[
        "btn",
        size === "small" ? "btn-sm" : "",
        size === "large" ? "btn-lg" : "",
        primary ? "btn-primary" : "btn-secondary",
        "story-btn",
        fullWidth ? "w-100" : "",
      ].join(" ")}
      {...props}
    >
      {label}

      {isLoading && <Spinner color="text-light" className="ms-2" />}
    </button>
  );
};
