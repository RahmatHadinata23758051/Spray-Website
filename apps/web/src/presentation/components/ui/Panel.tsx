import React from 'react';

export function Panel(p: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`surface-panel ${p.className ?? ''}`}>
      {p.title && <h2 className="surface-panel-title">{p.title}</h2>}
      <div className="p-4">{p.children}</div>
    </section>
  );
}
