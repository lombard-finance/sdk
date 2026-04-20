import { type ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'danger'
    | 'warning'
    | 'info'
    | 'light'
    | 'dark';
  className?: string;
}

/**
 * Reusable badge component for displaying labels and tags
 * Supports Bootstrap color variants
 */
export function Badge({
  children,
  variant = 'secondary',
  className = '',
}: BadgeProps) {
  return <span className={`badge bg-${variant} ${className}`}>{children}</span>;
}
