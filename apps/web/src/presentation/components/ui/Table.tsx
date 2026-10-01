import React from 'react';

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="table-shell">
      <table className="min-w-full divide-y divide-border-subtle text-sm">
        {children}
      </table>
    </div>
  );
}
