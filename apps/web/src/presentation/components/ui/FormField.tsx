import React from 'react';

export interface FormFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
  htmlFor?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  required,
  error,
  helperText,
  hint,
  className = '',
  htmlFor,
  children,
}: FormFieldProps) {
  const help = helperText ?? hint;

  return (
    <div className={`form-group flex flex-col gap-1 ${className}`}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="form-label text-xs font-semibold text-text-secondary flex items-center gap-1"
        >
          <span>{label}</span>
          {required && (
            <span className="text-semantic-danger font-bold" title="Wajib diisi">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {help && !error && (
        <div className="text-[11px] text-text-muted mt-0.5 leading-tight">{help}</div>
      )}
      {error && (
        <p className="text-[11px] text-semantic-danger font-medium mt-0.5 leading-tight" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
