import React from 'react';

interface SectionCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
  bodyClassName?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  children,
  className = 'mb-4',
  titleClassName = '',
  bodyClassName = '',
}) => {
  return (
    <div className={`card ${className}`}>
      {title && (
        <div className={`card-header ${titleClassName}`}>
          <h5 className="card-title mb-0">{title}</h5>
        </div>
      )}
      <div className={`card-body ${bodyClassName}`}>{children}</div>
    </div>
  );
};
