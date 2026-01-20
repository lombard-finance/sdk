interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'danger';
}

/**
 * Reusable statistics card component for displaying metrics
 * Shows a title, large value, and optional subtitle with color variants
 */
export function StatsCard({
  title,
  value,
  subtitle,
  variant = 'default',
}: StatsCardProps) {
  const borderClass = variant !== 'default' ? `border-${variant}` : '';
  const textClass = variant !== 'default' ? `text-${variant}` : '';

  return (
    <div className={`card ${borderClass}`}>
      <div className="card-body">
        <h6 className="card-subtitle mb-2 text-muted">{title}</h6>
        <h3 className={`card-title ${textClass}`}>{value}</h3>
        {subtitle && <small className="text-muted">{subtitle}</small>}
      </div>
    </div>
  );
}
