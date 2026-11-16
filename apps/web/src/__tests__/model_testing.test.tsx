/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { modelTestingRepository } from '../presentation/pages/ModelTesting/modelTestingRepository';
import { processModelSegmentation } from '../presentation/pages/ModelTesting/segmentationEngine';
import type { ExtractedRawFrame } from '../presentation/pages/ModelTesting/frameExtractor';

describe('Model Testing Sandbox', () => {
  beforeAll(() => {
    // Provide a lightweight 2D context mock for JSDOM
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string): any {
      if (contextId === '2d') {
        return {
          fillStyle: '#000000',
          strokeStyle: '#000000',
          lineWidth: 1,
          globalAlpha: 1.0,
          setLineDash: () => {},
          fillRect: () => {},
          strokeRect: () => {},
          drawImage: () => {},
          save: () => {},
          restore: () => {},
          getImageData: (_x: number, _y: number, w: number, h: number) => {
            const data = new Uint8ClampedArray(w * h * 4);
            // Fill with some dummy plume values (bright white in center)
            for (let i = 0; i < data.length; i += 4) {
              data[i] = 200;
              data[i + 1] = 200;
              data[i + 2] = 200;
              data[i + 3] = 255;
            }
            return { data, width: w, height: h };
          },
          createImageData: (w: number, h: number) => ({
            data: new Uint8ClampedArray(w * h * 4),
            width: w,
            height: h,
          }),
          putImageData: () => {},
        };
      }
      return null;
    } as any;

    HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,mockPngBase64';
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it('creates and lists model test runs', async () => {
    const created = await modelTestingRepository.create({
      title: 'Uji Coba Model Body Mist',
      productName: 'Body Mist Aqua',
      productLot: 'LOT-TEST-01',
      formulaNumber: 'LOT-TEST-01',
      trialType: 'R&D Screening',
      storageCondition: 'Ruang',
      bottlePosition: 'Tegak',
      modelVersion: 'v1.0-unet',
      operatorName: 'Nadia Putri',
      status: 'READY_FOR_UPLOAD',
      deviceType: 'Non-Aerosol',
      aerosolSpec: {
        actuatorCode: '',
        canBottleCode: '',
        valveCode: '',
        gasRatio: '',
        gasType: '',
        initialPressureBar: '',
        initialGrossWeightG: '',
      },
      nonAerosolSpec: {
        bottleCode: 'BTL-01',
        pumpCode: 'PMP-01',
        pumpSubType: 'Spray Cair',
        dipTubeDiameterMm: '1.5',
        initialGrossWeightG: '120.0',
      },
      observationObjectives: ['Panjang lintasan', 'Sebaran'],
      frames: [],
      selectedSupportingFrameIndexes: [],
    });

    expect(created.id).toMatch(/^MDL-\d{6}-\d{4}$/);
    expect(created.status).toBe('READY_FOR_UPLOAD');

    const list = await modelTestingRepository.list();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(created.id);
  });

  it('processes segmentation engine on raw frames and generates mask and overlay', async () => {
    // Create dummy canvas
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20, 20, 40, 40);

    const dummyRawFrames: ExtractedRawFrame[] = [
      {
        frameIndex: 0,
        timestampMs: 0,
        canvas,
        dataUrl: 'data:image/jpeg;base64,dummy0',
      },
      {
        frameIndex: 1,
        timestampMs: 500,
        canvas,
        dataUrl: 'data:image/jpeg;base64,dummy1',
      },
    ];

    const results = await processModelSegmentation(dummyRawFrames);
    expect(results.length).toBe(2);
    expect(results[0].frameIndex).toBe(0);
    expect(results[0].maskImageUrl).toBeDefined();
    expect(results[0].overlayImageUrl).toBeDefined();
    expect(results[1].timestampMs).toBe(500);
  });
});
