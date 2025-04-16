import { ReactNode } from 'react';

export const ErrorBlock = ({ children }: { children: ReactNode }) =>
  children && (
    <div
      style={{
        margin: '20px 0',
        padding: '10px 0',
        paddingLeft: '20px',
        borderLeft: '3px solid var(--bs-red)',
        whiteSpace: 'pre-wrap',
        fontSize: '0.8em',
        color: 'var(--bs-red)',
        background: '#fef5f6',
        overflow: 'hidden',
        borderRadius: '5px',
      }}
    >
      {children}
    </div>
  );
