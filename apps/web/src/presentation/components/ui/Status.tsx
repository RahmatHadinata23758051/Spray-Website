import React from 'react';

export interface StatusProps {
  children: React.ReactNode;
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  variant?: 'badge' | 'pill';
  className?: string;
}

export function Status({
  children,
  tone = 'info',
  variant = 'badge',
  className = '',
}: StatusProps) {
  const toneClasses = {
    info: 'border-primary/30 bg-primary-soft/60 text-primary-hover',
    success: 'border-semantic-success/30 bg-semantic-success-soft/70 text-semantic-success',
    warning: 'border-semantic-warning/30 bg-semantic-warning-soft/70 text-semantic-warning',
    danger: 'border-semantic-danger/30 bg-semantic-danger-soft/70 text-semantic-danger',
    neutral: 'border-border-strong bg-surface-subtle text-text-secondary',
  }[tone];

  const variantClasses =
    variant === 'pill'
      ? 'rounded-full px-2.5 py-1 text-xs'
      : 'rounded px-2 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 border font-semibold tracking-wide leading-none ${variantClasses} ${toneClasses} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" />
      <span>{children}</span>
    </span>
  );
}
