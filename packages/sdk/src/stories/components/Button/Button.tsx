import React from 'react';
import { Spinner } from '../Spinner';

export interface ButtonProps {
  disabled?: boolean;
  children?: React.ReactNode;
  primary?: boolean;
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  onClick?: () => void;
}

/**
 * Primary UI component for user interaction
 */
export const Button = ({
  primary = true,
  size = 'medium',
  children,
  isLoading,
  ...props
}: ButtonProps) => {
  const mode = primary
    ? 'storybook-button--primary'
    : 'storybook-button--secondary';

  return (
    <button
      type="button"
      className={[
        'btn',
        size === 'small' ? 'btn-sm' : '',
        size === 'large' ? 'btn-lg' : '',
        primary ? 'btn-primary' : 'btn-secondary',
      ].join(' ')}
      {...props}
    >
      {children}

      {isLoading && <Spinner color="text-light" className="ms-2" />}
    </button>
  );
};
