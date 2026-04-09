import React from "react";

import { CodeBlock } from "../CodeBlock/CodeBlock";

interface ResultDisplayProps {
  result: string | object | null | undefined; // Allow objects for JSON stringify
  title?: string;
  successMessage?: string;
  isJson?: boolean; // Flag to stringify objects
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  result,
  title = "Result",
  successMessage,
  isJson = false,
}) => {
  return (
    <div className="mt-4">
      <h5 className="mb-2">{title}:</h5>
      <CodeBlock text={result} withFormatting={isJson} />
      {successMessage && (
        <div className="alert alert-success mt-3" role="alert">
          {successMessage}
        </div>
      )}
    </div>
  );
};
