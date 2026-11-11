import React, { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className = '', error, rows = 2, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`form-textarea px-3 py-2 text-xs sm:text-sm text-text-primary bg-surface border rounded-md outline-none transition-colors resize-y placeholder:text-text-muted disabled:bg-surface-subtle disabled:text-text-muted disabled:cursor-not-allowed ${
        error
          ? 'border-semantic-danger focus:border-semantic-danger focus:ring-1 focus:ring-semantic-danger/30'
          : 'border-border-strong hover:border-border-strong focus:border-primary focus:ring-1 focus:ring-primary/20'
      } ${className}`}
      {...props}
    />
  );
});

