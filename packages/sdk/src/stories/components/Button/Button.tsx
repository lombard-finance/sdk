import './Button.css';

import React from 'react';

import { Spinner } from '../Spinner';

export interface ButtonProps {
  disabled?: boolean;
  children?: React.ReactNode;
  actionName?: string;
  primary?: boolean;
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  onClick?: () => void;
}

/**
 * Execute action button
 */
export const Button = ({
  primary: _primary = true,
  size = 'medium',
  actionName,
  children,
  isLoading,
  ...props
}: ButtonProps) => {
  const label = actionName ? (
    <span>
      Execute: <span style={{ fontFamily: 'monospace' }}>{actionName}</span>
    </span>
  ) : (
    children
  );

  return (
    <button
      type="button"
      className={[
        'btn',
        size === 'small' ? 'btn-sm' : '',
        size === 'large' ? 'btn-lg' : '',
        'story-btn',
      ].join(' ')}
      {...props}
    >
      {label}

      {isLoading && <Spinner color="text-primary" className="ms-2" />}
    </button>
  );
};
