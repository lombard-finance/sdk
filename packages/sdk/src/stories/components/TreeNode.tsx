import { type ReactNode } from 'react';

interface TreeNodeProps {
  label: ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  badge?: ReactNode;
  level?: number;
  children?: ReactNode;
}

/**
 * Reusable tree node component for registry explorers
 */
export function TreeNode({
  label,
  isExpanded,
  onToggle,
  badge,
  level = 0,
  children,
}: TreeNodeProps) {
  const bgColors = ['transparent', '#f8f9fa', '#e9ecef', '#dee2e6'];
  const backgroundColor = bgColors[level] || bgColors[bgColors.length - 1];
  const marginLeft = level > 0 ? '1rem' : '0';

  return (
    <div className="mb-2" style={{ marginLeft }}>
      <button
        type="button"
        className="btn btn-link text-start w-100 text-decoration-none p-2"
        style={{
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          backgroundColor,
        }}
        onClick={onToggle}
      >
        <span className="me-2">{isExpanded ? '▼' : '▶'}</span>
        <strong>{label}</strong>
        {badge && <span className="ms-2">{badge}</span>}
      </button>

      {isExpanded && children && <div className="mt-2">{children}</div>}
    </div>
  );
}
