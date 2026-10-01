import React from 'react';
import type { SelectedCaptureMoment } from '../../../domain/analysis';
import type { SynchronizedAnalysisFrame } from '../../../domain/types';
import { synchronizedFrames } from '../../../data/mockSpraybotRepository';

export function CaptureSelection({ 
  currentMoment, 
  selectedCaptures, 
  selectionError, 
  onSetPrimary, 
  onAddSupporting, 
  onRemoveSupporting 
}: {
  currentMoment: SynchronizedAnalysisFrame;
  selectedCaptures: SelectedCaptureMoment[];
  selectionError?: string;
  onSetPrimary: () => void;
  onAddSupporting: () => void;
  onRemoveSupporting: (id: string) => void;
}) {
  const currentSelection = selectedCaptures.find(item => item.captureFrameId === currentMoment.id);
  const selectedDetails = selectedCaptures.map(selection => ({
    selection,
    moment: synchronizedFrames.find(moment => moment.id === selection.captureFrameId),
  })).filter(item => item.moment !== undefined);

  return (
    <section className="capture-selection" aria-labelledby="capture-selection-title">
      <div className="capture-selection-heading">
        <h3 id="capture-selection-title">Report captures</h3>
        <strong>Selected Captures {selectedCaptures.length} / 10</strong>
      </div>
      <p className="capture-selection-help">Choose one shared Side + Front moment as Primary. Add up to nine Supporting moments.</p>
      <div className="capture-selection-actions">
        <button className="primary-button" type="button" onClick={onSetPrimary} disabled={currentSelection?.role === 'primary'}>
          {currentSelection?.role === 'primary' ? 'Primary capture' : 'Set as Primary'}
        </button>
        <button className="secondary-button" type="button" onClick={onAddSupporting} disabled={Boolean(currentSelection) || selectedCaptures.length >= 10}>
          {currentSelection?.role === 'supporting' ? 'Supporting capture' : 'Add Supporting'}
        </button>
      </div>
      {selectionError && <p className="capture-selection-error" role="alert">{selectionError}</p>}
      {selectedDetails.length === 0 ? (
        <p className="capture-selection-empty">No report captures selected. Finalization requires one Primary.</p>
      ) : (
        <ul className="capture-selection-list">
          {selectedDetails.map(({ selection, moment }) => moment && (
            <li key={selection.captureFrameId} className={selection.role === 'primary' ? 'capture-selection-primary' : ''}>
              <div className="capture-selection-jump">
                <span>{selection.role === 'primary' ? '★ Primary' : 'Supporting'}</span>
                <strong className="font-mono">Capture #{String(moment.frameIndex).padStart(3, '0')} · {moment.timestampMs} ms</strong>
              </div>
              {selection.role === 'supporting' && (
                <button type="button" className="capture-selection-remove" onClick={() => onRemoveSupporting(selection.captureFrameId)} aria-label={`Remove Supporting Capture ${moment.frameIndex}`}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
