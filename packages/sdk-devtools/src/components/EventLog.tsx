/**
 * EventLog - Console-style SDK event log
 *
 * Displays events from the SDK's built-in event emitter (BaseAction).
 * SDK events are clearly labeled to help developers understand
 * what events they'll receive when integrating the SDK.
 *
 * @module sdk-devtools/components/EventLog
 */

import { Terminal, Trash2, Zap } from 'lucide-react';

import type { DevToolsEvent } from '../types';

export interface EventLogProps {
  /** Events to display */
  events: DevToolsEvent[];

  /** Callback to clear events */
  onClear: () => void;

  /** Optional title override */
  title?: string;

  /** Whether to show the info banner */
  showInfoBanner?: boolean;

  /** Custom class name for the container */
  className?: string;
}

/**
 * Event Log Component
 *
 * Console-style log showing SDK events with timestamps and color coding.
 */
export function EventLog({
  events,
  onClear,
  title = 'SDK Event Log',
  showInfoBanner = true,
  className = '',
}: EventLogProps) {
  // Count SDK events
  const sdkEventCount = events.filter((e) => e.isSDKEvent).length;

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <Terminal className="w-3.5 h-3.5" />
          <span>{title}</span>
          {events.length > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-cyan-100 dark:bg-cyan-900/50 border border-cyan-200 dark:border-cyan-700/50 rounded text-[10px] text-cyan-600 dark:text-cyan-400">
              <Zap className="w-2.5 h-2.5" />
              {sdkEventCount} SDK events
            </span>
          )}
        </div>

        {events.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Info banner about SDK events */}
      {showInfoBanner && (
        <div className="px-3 py-1 bg-gray-100 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700/50 text-[10px] text-gray-500">
          💡 These events are emitted by the SDK's{' '}
          <code className="text-gray-900 dark:text-white font-semibold">
            action.on()
          </code>{' '}
          method
        </div>
      )}

      {/* Event List - scrollable */}
      <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed">
        {events.length === 0 ? (
          <div className="text-gray-400 dark:text-gray-600 text-center py-4">
            <p>SDK events will appear here...</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Single event row
 */
function EventRow({ event }: { event: DevToolsEvent }) {
  return (
    <div className="flex gap-2 hover:bg-gray-100 dark:hover:bg-gray-800/50 px-1 py-0.5 rounded">
      <span className="text-gray-400 dark:text-gray-600 flex-shrink-0">
        {formatTime(event.timestamp)}
      </span>
      {event.isSDKEvent && (
        <span className="flex-shrink-0 text-[9px] px-1 py-0.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-500 rounded border border-cyan-200 dark:border-cyan-800/50">
          SDK
        </span>
      )}
      {event.source && (
        <span className="flex-shrink-0 text-[9px] px-1 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded border border-purple-200 dark:border-purple-800/50">
          {event.source}
        </span>
      )}
      <span className={`flex-shrink-0 ${getEventColor(event.type)}`}>
        {event.type}
      </span>
      <span className="text-gray-400 dark:text-gray-500">→</span>
      <span className="text-gray-600 dark:text-gray-400 truncate">
        {formatEventData(event.data)}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${time}.${ms}`;
}

function getEventColor(type: string): string {
  if (type === 'error' || type === 'failed') return 'text-red-400';
  if (type === 'completed') return 'text-green-400';
  if (type === 'status-change') return 'text-cyan-400';
  if (type === 'progress') return 'text-blue-400';
  if (type === 'loading') return 'text-yellow-400';
  return 'text-gray-400';
}

function formatEventData(data: unknown): string {
  if (data === null || data === undefined) return '—';
  if (typeof data === 'string') return data;
  if (typeof data === 'boolean') return data ? 'true' : 'false';
  if (typeof data === 'object') {
    try {
      return JSON.stringify(data);
    } catch {
      return String(data);
    }
  }
  return String(data);
}
