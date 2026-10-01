import React from 'react';
import { Panel } from '../../components/ui/Panel';
import { Status } from '../../components/ui/Status';
import { Metric } from '../../components/ui/Metric';

export function CalibrationPage() {
  return (
    <Panel title="Mock calibration">
      <Status tone="warning">Mock calibration</Status>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Metric label="Side camera scale" value="0.42 mm / px" />
        <Metric label="Front reference center" value="300, 170 px" />
        <Metric label="ROI preview" value="Fixture ROI only" />
      </div>
    </Panel>
  );
}
