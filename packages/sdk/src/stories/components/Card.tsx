import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

/**
 * Reusable card component for registry explorers
 * Provides consistent styling for content containers
 */
export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`card ${className}`}>
      <div className="card-body">{children}</div>
    </div>
  );
}
