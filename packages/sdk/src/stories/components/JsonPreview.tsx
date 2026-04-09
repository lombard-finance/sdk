/**
 * JsonPreview Component
 *
 * A collapsible JSON viewer with syntax highlighting for developer tools.
 * Used in SDK playground stories to display workflow state, snapshots, and results.
 */

import { useState } from "react";

export interface JsonPreviewProps {
  /** Title displayed in the header */
  title: string;
  /** JSON data to display */
  data: unknown;
  /** Whether the preview is expanded by default */
  defaultExpanded?: boolean;
  /** Optional badge text to display next to the title */
  badge?: string;
  /** Badge variant for styling */
  badgeVariant?:
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning"
    | "info";
}

/**
 * JsonPreview component for displaying JSON data with expand/collapse
 */
export function JsonPreview({
  title,
  data,
  defaultExpanded = true,
  badge,
  badgeVariant = "secondary",
}: JsonPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border-top border-bottom">
      {/* Header */}
      <button
        type="button"
        className="d-flex justify-content-between align-items-center px-3 py-2 bg-secondary bg-opacity-10 w-100 border-0 text-start"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded ? "true" : "false"}
        aria-label={`${isExpanded ? "Collapse" : "Expand"} ${title}`}
      >
        <div className="d-flex align-items-center gap-2">
          <small className="text-uppercase text-muted fw-bold font-monospace">
            {title}
          </small>
          {badge && (
            <span className={`badge bg-${badgeVariant} font-monospace small`}>
              {badge}
            </span>
          )}
        </div>
        <span className="text-muted">{isExpanded ? "▼" : "▶"}</span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-2 bg-dark overflow-auto json-preview-content">
          <pre className="text-light font-monospace small m-0 json-preview-pre">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}

      {/* Inline styles for specific constraints */}
      <style>{`
        .json-preview-content {
          max-height: 300px;
        }
        .json-preview-pre {
          font-size: 0.7rem;
        }
      `}</style>
    </div>
  );
}
