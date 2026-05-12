/**
 * StatusIndicator component for displaying deployment and feature status
 * Shows a colored dot indicator with optional label
 */
interface StatusIndicatorProps {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  showLabel?: boolean;
}

export function StatusIndicator({
  active,
  activeLabel = 'Active',
  inactiveLabel = 'Inactive',
  showLabel = true,
}: StatusIndicatorProps) {
  const backgroundColor = active ? '#198754' : '#dc3545';

  return (
    <div className="d-flex align-items-center gap-2">
      <span
        className="rounded-circle d-inline-block"
        style={{
          width: '12px',
          height: '12px',
          backgroundColor,
        }}
      />
      {showLabel && (
        <span className="fw-semibold">
          {active ? activeLabel : inactiveLabel}
        </span>
      )}
    </div>
  );
}
