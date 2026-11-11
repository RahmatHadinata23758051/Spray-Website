import React, { forwardRef } from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className = '', error, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={`form-select h-9 px-3 py-1.5 text-xs sm:text-sm text-text-primary bg-surface border rounded-md outline-none transition-colors disabled:bg-surface-subtle disabled:text-text-muted disabled:cursor-not-allowed ${
        error
          ? 'border-semantic-danger focus:border-semantic-danger focus:ring-1 focus:ring-semantic-danger/30'
          : 'border-border-strong hover:border-border-strong focus:border-primary focus:ring-1 focus:ring-primary/20'
      } ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});

