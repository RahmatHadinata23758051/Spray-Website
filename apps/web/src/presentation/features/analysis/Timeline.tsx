import type { SynchronizedAnalysisFrame, Analysis as AnalysisData, CapturePhaseV2 } from '@spray-paragon/domain';
import { phaseLabel } from './utils';

export function Timeline({ moments, analysis, selectedIndex, onSelect }: { moments: SynchronizedAnalysisFrame[]; analysis: AnalysisData; selectedIndex: number; onSelect: (index: number) => void }) {
  const phases: CapturePhaseV2[] = ['pre_spray', 'build_up', 'stable', 'decay'];
  const current = moments[selectedIndex];
  return (
    <div className="analysis-timeline">
      <div className="timeline-header">
        <span>Capture timeline</span>
        <span>
          <strong className="font-mono">Capture #{String(current.frameIndex).padStart(3, '0')}</strong> · <strong className="font-mono">{selectedIndex + 1} of {moments.length}</strong> · <strong className="font-mono">{current.timestampMs} ms</strong>
        </span>
      </div>
      <div className="timeline-phases" aria-hidden="true">
        {phases.map(phase => {
          const count = moments.filter(moment => moment.phase === phase).length;
          return <span key={phase} style={{ flex: count }}>{phaseLabel(phase)}</span>;
        })}
      </div>
      <div className="timeline-bars">
        {moments.map((moment, index) => {
          const inWindow = moment.timestampMs >= analysis.analysisWindow.startMs && moment.timestampMs <= analysis.analysisWindow.endMs;
          const isCurrent = index === selectedIndex;
          return (
            <button
              key={moment.id}
              onClick={() => onSelect(index)}
              className={`timeline-frame phase-${moment.phase.replace('_', '')} ${inWindow ? 'timeline-stable' : ''} ${moment.recommended ? 'timeline-recommended' : ''} ${isCurrent ? 'timeline-current' : ''}`}
              title={`Capture #${moment.frameIndex} · ${moment.timestampMs} ms · ${phaseLabel(moment.phase)}${moment.recommended ? ' · Recommended' : ''}`}
              aria-label={`Capture ${moment.frameIndex} ${moment.timestampMs} ms ${phaseLabel(moment.phase)}${moment.recommended ? ' recommended' : ''}`}
              aria-pressed={isCurrent}
            />
          );
        })}
      </div>
      <div className="timeline-footer">
        <span>Pre-spray</span><span>Build-up</span><span>Stable phase {analysis.analysisWindow.startMs}–{analysis.analysisWindow.endMs} ms</span><span>Decay</span>
      </div>
    </div>
  );
}
