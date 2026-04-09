/**
 * ReducerLog - Redux DevTools-style action log
 *
 * Shows dispatched actions with before/after state diffs.
 *
 * @module sdk-devtools/components/ReducerLog
 */

import { Activity, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useState } from "react";

import type { ReducerLogEntry } from "../types";

export interface ReducerLogProps {
  /** Log entries to display */
  logs: ReducerLogEntry[];

  /** Callback to clear logs */
  onClear: () => void;

  /** Custom class name */
  className?: string;
}

/**
 * Reducer Log Component
 *
 * Displays reducer actions in a time-ordered list with expandable details.
 */
export function ReducerLog({ logs, onClear, className = "" }: ReducerLogProps) {
  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <Activity className="w-3.5 h-3.5" />
          <span>Action Log</span>
          {logs.length > 0 && (
            <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">
              {logs.length} actions
            </span>
          )}
        </div>

        {logs.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Log List */}
      <div className="flex-1 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-gray-400 dark:text-gray-600 text-center py-4 text-xs">
            <p>Reducer actions will appear here...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {logs.map((log) => (
              <LogEntry key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Log Entry Component
// ─────────────────────────────────────────────────────────────────

function LogEntry({ log }: { log: ReducerLogEntry }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="text-xs">
      <button
        onClick={() => {
          setIsExpanded(!isExpanded);
        }}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-gray-400 dark:text-gray-500" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-500" />
        )}
        <span className="text-gray-400 dark:text-gray-600 flex-shrink-0 font-mono">
          {formatTime(log.timestamp)}
        </span>
        <span className="text-cyan-600 dark:text-cyan-400 font-medium">
          {log.action.type}
        </span>
        {log.action.payload !== undefined && (
          <span className="text-gray-500 truncate">
            {formatPayload(log.action.payload)}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Action payload */}
          {log.action.payload !== undefined && (
            <div>
              <div className="text-[10px] text-gray-500 mb-1">Payload</div>
              <pre className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono text-amber-600 dark:text-yellow-300 overflow-x-auto">
                {JSON.stringify(log.action.payload, null, 2)}
              </pre>
            </div>
          )}

          {/* State diff */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-gray-500 mb-1">Before</div>
              <pre className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono text-gray-600 dark:text-gray-400 overflow-x-auto max-h-32 overflow-y-auto">
                {JSON.stringify(log.prevState, null, 2)}
              </pre>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 mb-1">After</div>
              <pre className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono text-green-600 dark:text-green-400 overflow-x-auto max-h-32 overflow-y-auto">
                {JSON.stringify(log.nextState, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatPayload(payload: unknown): string {
  if (payload === null || payload === undefined) return "";
  if (typeof payload === "string") return `"${payload}"`;
  if (typeof payload === "object") {
    try {
      const str = JSON.stringify(payload);
      return str.length > 50 ? str.slice(0, 50) + "..." : str;
    } catch {
      return String(payload);
    }
  }
  return String(payload);
}
