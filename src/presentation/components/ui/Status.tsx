import React from 'react';

export function Status({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral' }) {
  const c = {
    info: 'border-primary/20 bg-primary-soft text-primary-hover',
    success: 'border-semantic-success/25 bg-semantic-success-soft text-semantic-success',
    warning: 'border-semantic-warning/25 bg-semantic-warning-soft text-semantic-warning',
    danger: 'border-semantic-danger/25 bg-semantic-danger-soft text-semantic-danger',
    neutral: 'border-border-default bg-subtle text-text-secondary',
  }[tone];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-semibold leading-none ${c}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
