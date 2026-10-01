import React from 'react';
import { Panel } from '../../components/ui/Panel';

export function SettingsPage() {
  return (
    <Panel title="Settings">
      <div className="space-y-4 max-w-xl">
        <div>
          <div className="text-sm font-semibold">Local Workstation Environment</div>
          <p className="text-xs text-text-secondary">System configuration for Spraybot analysis station.</p>
        </div>
        <div className="grid gap-3 rounded-md border border-border-default bg-subtle p-4 text-xs">
          <div className="flex justify-between">
            <span className="text-text-muted">Node Environment</span>
            <span className="font-mono font-medium">development</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Analysis Backend</span>
            <span className="font-mono font-medium">Fixture Mock Engine</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Authentication Mode</span>
            <span className="font-mono font-medium">Local PostgreSQL Session</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}
