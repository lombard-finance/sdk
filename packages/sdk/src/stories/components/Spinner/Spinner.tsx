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
    <div
      className={[
        'spinner-border',
        color,
        size === 'sm' ? 'spinner-border-sm' : '',
        className || '',
      ].join(' ')}
      role="status"
    >
      <span className="visually-hidden">Loading...</span>
    </div>
  );
}
