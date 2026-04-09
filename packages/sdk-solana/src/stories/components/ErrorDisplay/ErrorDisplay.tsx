import React from "react";

import { SolanaSdkError } from "../../../utils/errors";

interface ErrorDisplayProps {
  error: SolanaSdkError | Error | undefined;
  title?: string;
  children?: React.ReactNode;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  title = "Error",
  children,
}) => {
  const errorCode = error instanceof SolanaSdkError ? error.code : undefined;
  const errorMessage = error?.message;

  const canDisplayError = errorCode || errorMessage;

  if (!canDisplayError && !children) {
    return null; // Render nothing if no error and no children
  }

  return (
    <div className="alert alert-danger mt-3" role="alert">
      <h5 className="alert-heading">{title}:</h5>
      {errorCode && <p className="mt-2">{errorCode}</p>}
      {errorMessage && <p className="mt-2">{errorMessage}</p>}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
};
