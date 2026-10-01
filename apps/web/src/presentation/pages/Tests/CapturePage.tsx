import type { Page } from '../../navigation';
import type { Camera as CameraType } from '@spray-paragon/domain';
import { simulationService } from '../../../application/services';
const frames = simulationService.getFrames();
import { Status } from '../../components/ui/Status';
import { Panel } from '../../components/ui/Panel';

import { Overlay } from '../../components/ui/Overlay';

export function CapturePage({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <div className="space-y-5">
      <Status>Simulation mode — fixture capture</Status>
      <div className="grid gap-4 lg:grid-cols-2">
        {(['side', 'front'] as CameraType[]).map(c => <CameraBox key={c} camera={c} />)}
      </div>
      <Panel title="Capture timeline">
        <div className="flex gap-1">
          {frames.map(f => (
            <div 
              key={f.frameIndex} 
              title={`${f.frameIndex} ${f.phase}`} 
              className={`h-8 flex-1 rounded-xs ${f.phase === 'stable' ? 'bg-primary' : 'bg-border-default'}`} 
            />
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button 
            onClick={() => setPage('Analysis')} 
            className="rounded-sm bg-primary px-4 py-2 text-white"
          >
            Open analysis
          </button>
        </div>
      </Panel>
    </div>
  );
}

function CameraBox({ camera }: { camera: CameraType }) {
  return (
    <Panel title={`${camera[0].toUpperCase() + camera.slice(1)} Camera`}>
      <div className="relative aspect-video overflow-hidden rounded-sm border border-border-strong bg-subtle">
        <Overlay camera={camera} />
      </div>
      <p className="mt-2 text-xs text-text-muted">Mock capture loaded · fixture frame set</p>
    </Panel>
  );
}
