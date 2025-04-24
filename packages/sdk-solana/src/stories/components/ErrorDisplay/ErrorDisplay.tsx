import React from 'react';
import { errorToString } from '../../../utils/errors'; // Assuming this utility exists

interface ErrorDisplayProps {
  error: string | Error | null | undefined;
  title?: string;
  children?: React.ReactNode; // Allow custom content for complex errors
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  title = 'Error',
  children,
}) => {
  const errorMessage = error ? errorToString(error) : null;

  if (!errorMessage && !children) {
    return null; // Render nothing if no error and no children
  }

  return (
    <div className="alert alert-danger mt-3" role="alert">
      <h5 className="alert-heading">{title}:</h5> {/* Use alert heading */}
      {errorMessage && <p className="mb-0">{errorMessage}</p>}
      {children && <div className="mt-2">{children}</div>}{' '}
      {/* Render children if provided */}
    </div>
  );
};
