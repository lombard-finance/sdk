/**
 * StateInspector - Debug panel for inspecting state objects
 *
 * Displays state in an expandable JSON tree with syntax highlighting.
 * Supports copy-to-clipboard and collapsible sections.
 *
 * @module sdk-devtools/components/StateInspector
 */

import { Check,ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { useCallback,useState } from 'react';

export interface StateInspectorProps {
  /** State object to inspect */
  state: Record<string, unknown>;

  /** Optional title */
  title?: string;

  /** Initial expansion depth (default: 2) */
  defaultExpandDepth?: number;

  /** Custom class name */
  className?: string;
}

/**
 * State Inspector Component
 *
 * Renders a collapsible JSON tree viewer with syntax highlighting.
 */
export function StateInspector({
  state,
  title = 'State',
  defaultExpandDepth = 2,
  className = '',
}: StateInspectorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
      setCopied(true);
      setTimeout(() => { setCopied(false); }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [state]);

  return (
    <div
      className={`bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-full flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => { setIsExpanded(!isExpanded); }}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          {title}
        </button>
        <button
          onClick={() => { void handleCopy(); }}
          className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          title="Copy state as JSON"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-green-500 dark:text-green-400" />
              <span className="text-green-500 dark:text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-3 flex-1 overflow-auto">
          <StateTree value={state} defaultExpandDepth={defaultExpandDepth} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// State Tree Component (recursive JSON viewer)
// ─────────────────────────────────────────────────────────────────

interface StateTreeProps {
  value: unknown;
  depth?: number;
  keyName?: string;
  defaultExpandDepth?: number;
}

function StateTree({
  value,
  depth = 0,
  keyName,
  defaultExpandDepth = 2,
}: StateTreeProps) {
  const [isOpen, setIsOpen] = useState(depth < defaultExpandDepth);

  const indent = depth * 12;
  const isExpandable = value !== null && typeof value === 'object';

  // Render primitive values
  if (!isExpandable) {
    return (
      <div
        className="flex items-baseline gap-1 font-mono text-xs"
        style={{ marginLeft: indent }}
      >
        {keyName && <span className="text-purple-600 dark:text-purple-400">{keyName}:</span>}
        <ValueDisplay value={value} />
      </div>
    );
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <div className="font-mono text-xs" style={{ marginLeft: indent }}>
          {keyName && <span className="text-purple-600 dark:text-purple-400">{keyName}: </span>}
          <span className="text-gray-400 dark:text-gray-500">[]</span>
        </div>
      );
    }

    return (
      <div style={{ marginLeft: indent }}>
        <button
          onClick={() => { setIsOpen(!isOpen); }}
          className="flex items-center gap-1 font-mono text-xs hover:bg-gray-200 dark:hover:bg-gray-800 rounded px-1 -ml-1"
        >
          {isOpen ? (
            <ChevronDown className="w-3 h-3 text-gray-400 dark:text-gray-500" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-500" />
          )}
          {keyName && <span className="text-purple-600 dark:text-purple-400">{keyName}:</span>}
          <span className="text-gray-500">[{value.length}]</span>
        </button>
        {isOpen && (
          <div className="ml-2">
            {value.map((item, i) => (
              <StateTree
                key={i}
                value={item}
                depth={depth + 1}
                keyName={String(i)}
                defaultExpandDepth={defaultExpandDepth}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Handle objects
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    return (
      <div className="font-mono text-xs" style={{ marginLeft: indent }}>
        {keyName && <span className="text-purple-600 dark:text-purple-400">{keyName}: </span>}
        <span className="text-gray-400 dark:text-gray-500">{'{}'}</span>
      </div>
    );
  }

  return (
    <div style={{ marginLeft: indent }}>
      <button
        onClick={() => { setIsOpen(!isOpen); }}
        className="flex items-center gap-1 font-mono text-xs hover:bg-gray-200 dark:hover:bg-gray-800 rounded px-1 -ml-1"
      >
        {isOpen ? (
          <ChevronDown className="w-3 h-3 text-gray-400 dark:text-gray-500" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-500" />
        )}
        {keyName && <span className="text-purple-600 dark:text-purple-400">{keyName}:</span>}
        <span className="text-gray-500">{`{${entries.length}}`}</span>
      </button>
      {isOpen && (
        <div className="ml-2">
          {entries.map(([key, val]) => (
            <StateTree
              key={key}
              value={val}
              depth={depth + 1}
              keyName={key}
              defaultExpandDepth={defaultExpandDepth}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Value Display (colors based on type)
// ─────────────────────────────────────────────────────────────────

function ValueDisplay({ value }: { value: unknown }) {
  if (value === null) {
    return <span className="text-gray-400 dark:text-gray-500">null</span>;
  }
  if (value === undefined) {
    return <span className="text-gray-400 dark:text-gray-500">undefined</span>;
  }
  if (typeof value === 'boolean') {
    return <span className="text-blue-600 dark:text-blue-400">{String(value)}</span>;
  }
  if (typeof value === 'number') {
    return <span className="text-green-600 dark:text-green-400">{value}</span>;
  }
  if (typeof value === 'string') {
    // Truncate long strings
    const display = value.length > 50 ? `${value.slice(0, 50)}...` : value;
    return <span className="text-amber-600 dark:text-yellow-300">"{display}"</span>;
  }
  return <span className="text-gray-600 dark:text-gray-400">{String(value)}</span>;
}

