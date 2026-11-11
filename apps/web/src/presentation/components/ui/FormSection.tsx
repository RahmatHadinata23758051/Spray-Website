import React from 'react';

export interface FormSectionProps {
  title?: string;
  description?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  gridClassName?: string;
}

export function FormSection({
  title,
  description,
  subtitle,
  badge,
  children,
  className = '',
  gridClassName = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3.5',
}: FormSectionProps) {
  const desc = description ?? subtitle;

  return (
    <section className={`space-y-3 ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-border-subtle pb-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
              {title}
            </h3>
            {desc && (
              <p className="text-[11px] text-text-muted mt-0.5">{desc}</p>
            )}
          </div>
          {badge && <div>{badge}</div>}
        </div>
      )}
      <div className={gridClassName}>{children}</div>
    </section>
  );
}
