/**
 * NetworkLog - Display API requests and responses
 *
 * Shows a list of HTTP requests made by the SDK with:
 * - Method and URL
 * - Status code and duration
 * - Request payload and response data
 * - Error information for failed requests
 */

import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
} from "lucide-react";
import { useState } from "react";

import type { NetworkLogEntry } from "../types";

interface NetworkLogProps {
  /** Network log entries */
  entries: NetworkLogEntry[];

  /** Clear network log callback */
  onClear: () => void;

  /** Maximum height for scrolling */
  maxHeight?: string;
}

export function NetworkLog({
  entries,
  onClear,
  maxHeight = "400px",
}: NetworkLogProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
        <Clock className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">No API requests yet</p>
        <p className="text-xs opacity-75 mt-1">
          Requests will appear here when you use SDK methods
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {entries.length} request{entries.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Clear
        </button>
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight }}>
        {entries.map((entry) => (
          <NetworkEntry
            key={entry.request.id}
            entry={entry}
            isExpanded={expandedIds.has(entry.request.id)}
            onToggle={() => {
              toggleExpand(entry.request.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Network Entry Component
// ─────────────────────────────────────────────────────────────────

interface NetworkEntryProps {
  entry: NetworkLogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}

function NetworkEntry({ entry, isExpanded, onToggle }: NetworkEntryProps) {
  const { request, response, isPending, isFailed } = entry;

  // Method color
  const methodColor =
    {
      GET: "text-emerald-600 dark:text-emerald-400",
      POST: "text-blue-600 dark:text-blue-400",
      PUT: "text-amber-600 dark:text-amber-400",
      DELETE: "text-red-600 dark:text-red-400",
      PATCH: "text-purple-600 dark:text-purple-400",
    }[request.method] || "text-gray-600 dark:text-gray-400";

  // Status indicator
  const StatusIcon = isPending
    ? () => <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
    : isFailed
      ? () => <AlertCircle className="w-3.5 h-3.5 text-red-500" />
      : () => <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;

  // Extract path from URL
  const urlPath = (() => {
    try {
      const url = new URL(request.url, "http://localhost");
      return url.pathname + url.search;
    } catch {
      return request.url;
    }
  })();

  return (
    <div
      className={`border-b border-gray-100 dark:border-gray-700/50 ${isFailed ? "bg-red-50/50 dark:bg-red-900/10" : ""}`}
    >
      {/* Entry Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        )}

        <StatusIcon />

        <span
          className={`text-xs font-mono font-bold ${methodColor} w-10 flex-shrink-0`}
        >
          {request.method}
        </span>

        <span className="flex-1 text-xs font-mono text-gray-700 dark:text-gray-300 truncate">
          {urlPath}
        </span>

        {response && (
          <>
            <span
              className={`text-xs font-mono ${isFailed ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}
            >
              {response.status}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {response.duration}ms
            </span>
          </>
        )}

        {request.source && (
          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
            {request.source}
          </span>
        )}
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Request */}
          <div>
            <h4
              style={{ fontSize: "10px", lineHeight: "14px" }}
              className="font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1"
            >
              Request
            </h4>
            <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 overflow-x-auto max-w-full">
              {request.payload ? (
                <pre
                  style={{ fontSize: "11px", lineHeight: "16px" }}
                  className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all font-mono m-0"
                >
                  {JSON.stringify(request.payload, null, 2)}
                </pre>
              ) : (
                <span
                  style={{ fontSize: "11px" }}
                  className="text-gray-400 italic"
                >
                  No payload
                </span>
              )}
            </div>
          </div>

          {/* Response */}
          {response && (
            <div>
              <h4
                style={{ fontSize: "10px", lineHeight: "14px" }}
                className="font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1"
              >
                Response
                {response.error && (
                  <span className="text-red-500 ml-2">Error</span>
                )}
              </h4>
              <div
                className={`rounded p-2 overflow-x-auto max-w-full ${isFailed ? "bg-red-50 dark:bg-red-900/20" : "bg-gray-50 dark:bg-gray-800"}`}
              >
                {response.error ? (
                  <pre
                    style={{ fontSize: "11px", lineHeight: "16px" }}
                    className="text-red-600 dark:text-red-400 whitespace-pre-wrap break-all font-mono m-0"
                  >
                    {response.error}
                  </pre>
                ) : response.data ? (
                  <pre
                    style={{ fontSize: "11px", lineHeight: "16px" }}
                    className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all font-mono m-0"
                  >
                    {JSON.stringify(response.data, null, 2)}
                  </pre>
                ) : (
                  <span
                    style={{ fontSize: "11px" }}
                    className="text-gray-400 italic"
                  >
                    No data
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Pending indicator */}
          {isPending && (
            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Waiting for response...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
