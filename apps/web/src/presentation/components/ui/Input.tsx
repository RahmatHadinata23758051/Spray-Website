import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  mono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', error, mono, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={`form-input h-9 px-3 py-1.5 text-xs sm:text-sm text-text-primary bg-surface border rounded-md outline-none transition-colors placeholder:text-text-muted disabled:bg-surface-subtle disabled:text-text-muted disabled:cursor-not-allowed ${
        error
          ? 'border-semantic-danger focus:border-semantic-danger focus:ring-1 focus:ring-semantic-danger/30'
          : 'border-border-strong hover:border-border-strong focus:border-primary focus:ring-1 focus:ring-primary/20'
      } ${mono ? 'font-mono' : ''} ${className}`}
      {...props}
    />
  );
});

