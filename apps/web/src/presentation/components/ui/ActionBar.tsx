import React from 'react';

export interface ActionBarProps {
  children?: React.ReactNode;
  className?: string;
  leftContent?: React.ReactNode;
  info?: React.ReactNode;
  actions?: React.ReactNode;
}

export function ActionBar({
  children,
  className = '',
  leftContent,
  info,
  actions,
}: ActionBarProps) {
  const left = leftContent ?? info;
  const right = actions ?? children;

  return (
    <div
      className={`border-t border-border-default bg-surface px-5 py-3 flex items-center justify-between gap-3 ${className}`}
    >
      <div className="text-xs text-text-muted">{left}</div>
      <div className="flex items-center gap-2.5">{right}</div>
    </div>
  );
}

