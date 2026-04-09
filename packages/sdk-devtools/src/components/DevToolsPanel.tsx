/**
 * DevToolsPanel - Main DevTools container with tabs
 *
 * Combined debug view showing SDK Events, State, and Action Log.
 * This is the main component you'd render in your app.
 *
 * @module sdk-devtools/components/DevToolsPanel
 */

import {
  Activity,
  Bug,
  Database,
  Maximize2,
  Minimize2,
  Terminal,
  Wifi,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { DevToolsEvent, NetworkLogEntry, ReducerLogEntry } from "../types";
import { EventLog } from "./EventLog";
import { NetworkLog } from "./NetworkLog";
import { ReducerLog } from "./ReducerLog";
import { StateInspector } from "./StateInspector";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type TabId = "events" | "reducer" | "state" | "network";

export interface DevToolsPanelProps {
  /** SDK events to display */
  events: DevToolsEvent[];

  /** Clear SDK events callback */
  onClearEvents: () => void;

  /** Reducer action logs */
  reducerLogs?: ReducerLogEntry[];

  /** Clear reducer logs callback */
  onClearReducerLogs?: () => void;

  /** Current state for inspection */
  state?: Record<string, unknown>;

  /** Network log entries */
  networkLog?: NetworkLogEntry[];

  /** Clear network log callback */
  onClearNetworkLog?: () => void;

  /** Initial tab to show */
  initialTab?: TabId;

  /** Whether to show minimized by default */
  defaultMinimized?: boolean;

  /** Custom class name */
  className?: string;

  /** Optional title */
  title?: string;

  /** Callback when minimize button is clicked (for external control) */
  onMinimize?: () => void;
}

/**
 * DevTools Panel Component
 *
 * Main container for all DevTools functionality with tabbed navigation.
 */
export function DevToolsPanel({
  events,
  onClearEvents,
  reducerLogs = [],
  onClearReducerLogs,
  state = {},
  networkLog = [],
  onClearNetworkLog,
  initialTab = "events",
  defaultMinimized = false,
  className = "",
  title = "DevTools",
  onMinimize,
}: DevToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);

  // Handle minimize - call external callback if provided, otherwise toggle internal state
  const handleMinimize = () => {
    if (onMinimize) {
      onMinimize();
    } else {
      setIsMinimized(true);
    }
  };

  const tabs = useMemo(
    () => [
      {
        id: "events" as const,
        label: "Events",
        icon: Terminal,
        count: events.length,
      },
      {
        id: "network" as const,
        label: "Network",
        icon: Wifi,
        count: networkLog.length,
      },
      {
        id: "reducer" as const,
        label: "Actions",
        icon: Activity,
        count: reducerLogs.length,
      },
      {
        id: "state" as const,
        label: "State",
        icon: Database,
        count: null,
      },
    ],
    [events.length, reducerLogs.length, networkLog.length],
  );

  if (isMinimized) {
    return (
      <button
        onClick={() => {
          setIsMinimized(false);
        }}
        className={`
          flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg 
          text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
          ${className}
        `}
      >
        <Bug className="w-4 h-4" />
        <span className="text-xs font-medium">{title}</span>
        {events.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400 rounded">
            {events.length}
          </span>
        )}
        <Maximize2 className="w-3 h-3 ml-1" />
      </button>
    );
  }

  return (
    <div
      className={`h-full flex flex-col bg-white dark:bg-gray-900 ${className}`}
    >
      {/* Tab Header */}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-1 px-2">
          <Bug className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
            {title}
          </span>
        </div>

        <div className="flex-1 flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
              }}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors
                ${
                  activeTab === tab.id
                    ? "text-cyan-600 dark:text-cyan-400 border-cyan-500 dark:border-cyan-400 bg-white dark:bg-gray-900/50"
                    : "text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/30"
                }
              `}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className="ml-1 px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[9px]">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Minimize button */}
        <button
          onClick={handleMinimize}
          className="px-2 py-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="Minimize"
        >
          <Minimize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "events" && (
          <EventLog events={events} onClear={onClearEvents} />
        )}
        {activeTab === "network" && (
          <NetworkLog
            entries={networkLog}
            onClear={onClearNetworkLog ?? (() => {})}
          />
        )}
        {activeTab === "reducer" && (
          <ReducerLog
            logs={reducerLogs}
            onClear={onClearReducerLogs ?? (() => {})}
          />
        )}
        {activeTab === "state" && (
          <div className="h-full overflow-auto p-2">
            <StateInspector state={state} title="Current State" />
          </div>
        )}
      </div>
    </div>
  );
}
