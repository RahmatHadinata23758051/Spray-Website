import type { Frame, SynchronizedAnalysisFrame, FixtureScenario, Analysis, Test, SidePixelGeometry, FrontPixelGeometry, SideOrientation } from '@spray-paragon/domain';

export interface SimulationService {
  getFrames(): Frame[];
  getSynchronizedFrames(): SynchronizedAnalysisFrame[];
  getPixelGeometry(frameIndex: number, scenario: FixtureScenario, sideOrientation?: SideOrientation): { side: SidePixelGeometry; front: FrontPixelGeometry };
  getAnalyses(): Record<FixtureScenario, Analysis>;
  getTests(): Test[];
}
