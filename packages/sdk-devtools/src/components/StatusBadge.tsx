/**
 * StatusBadge - Displays current flow status with color coding
 *
 * Shows the action status in a pill/badge format with appropriate colors.
 *
 * @module sdk-devtools/components/StatusBadge
 */

export interface StatusBadgeProps {
  /** Status string to display */
  status?: string | unknown;

  /** Custom class name */
  className?: string;
}

/**
 * Status Badge Component
 *
 * Displays action status with color coding based on status type.
 */
export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  // Handle undefined/null/non-string status - convert to string safely
  const safeStatus =
    typeof status === "string" ? status : String(status ?? "idle");

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
        ${getStatusColor(safeStatus)}
        ${className}
      `}
    >
      {formatStatus(safeStatus)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────

function getStatusColor(status: string): string {
  const lower = status.toLowerCase();

  // Initial/idle states
  if (lower === "idle" || lower === "not_created") {
    return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  }

  // Success/final states
  if (lower.includes("address_ready") || lower === "completed") {
    return "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300";
  }

  // Authorization/waiting states
  if (
    lower.includes("needs") ||
    lower.includes("authorization") ||
    lower.includes("approval")
  ) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
  }

  // Confirming state
  if (lower === "confirming") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
  }

  // Ready state
  if (lower === "ready") {
    return "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300";
  }

  // Default
  return "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300";
}

function formatStatus(status: string): string {
  // Handle both snake_case and kebab-case
  return status
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
