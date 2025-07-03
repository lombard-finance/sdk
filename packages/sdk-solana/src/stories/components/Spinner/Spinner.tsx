import { JSX } from 'react';

interface ISpinnerProps {
  color?: 'text-primary' | 'text-light';
  size?: 'sm' | 'md';
  className?: string;
}

export function Spinner({
  color = 'text-primary',
  size = 'sm',
  className,
}: ISpinnerProps): JSX.Element {
  return (
    <output
      className={[
        'spinner-border',
        color,
        size === 'sm' ? 'spinner-border-sm' : '',
        className || '',
      ].join(' ')}
      aria-label="Loading..."
    >
      <span className="visually-hidden">Loading...</span>
    </output>
  );
}
