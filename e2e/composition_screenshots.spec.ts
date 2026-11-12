import { test, expect } from '@playwright/test';
import path from 'path';

const outDir = 'C:/Users/user/.gemini/antigravity/brain/f548d54b-8e36-42d2-ac47-e7514fc51bc5/screenshots';

const viewports = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: 'mobile-390x844', width: 390, height: 844 },
];

for (const vp of viewports) {
  test(`Capture key routes at ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    // 1. Dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(outDir, `dashboard_${vp.name}.png`),
      fullPage: false,
    });

    // 2. Kode Pengujian List
    await page.goto('/kode-pengujian');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(outDir, `kode_pengujian_list_${vp.name}.png`),
      fullPage: false,
    });

    // 2b. Kode Pengujian Detail
    const openKpLink = page.getByRole('link', { name: 'Buka' }).first();
    if (await openKpLink.isVisible().catch(() => false)) {
      await openKpLink.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({
        path: path.join(outDir, `kode_pengujian_detail_${vp.name}.png`),
        fullPage: false,
      });

      // 2c. Wizard Step 01
      const mulaiBtn = page.getByRole('button', { name: 'Mulai Pengujian' }).first();
      if (await mulaiBtn.isVisible().catch(() => false)) {
        await mulaiBtn.click();
        await page.waitForLoadState('networkidle');
        await page.screenshot({
          path: path.join(outDir, `wizard_step01_${vp.name}.png`),
          fullPage: false,
        });

        // 2d. Step 05 Result Summary with Evidence Gallery
        const currentUrl = page.url();
        if (currentUrl.includes('/execute')) {
          await page.goto(currentUrl.replace(/step=\d+/, 'step=5'));
          await page.waitForLoadState('networkidle');
          await page.screenshot({
            path: path.join(outDir, `wizard_step05_${vp.name}.png`),
            fullPage: false,
          });
        }
      }
    }

    // 3. New Kode Pengujian
    await page.goto('/kode-pengujian/new');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Identitas Produk' })).toBeVisible();
    await page.screenshot({
      path: path.join(outDir, `kode_pengujian_new_${vp.name}.png`),
      fullPage: false,
    });

    // 4. Products Master Data
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(outDir, `products_${vp.name}.png`),
      fullPage: false,
    });

    // 5. Calibration
    await page.goto('/calibration');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(outDir, `calibration_${vp.name}.png`),
      fullPage: false,
    });

    // 6. Reports
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(outDir, `reports_${vp.name}.png`),
      fullPage: false,
    });

    // 7. Settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(outDir, `settings_${vp.name}.png`),
      fullPage: false,
    });

    // 8. Login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(outDir, `login_${vp.name}.png`),
      fullPage: false,
    });
  });
}

test('Capture Finalized Step 05 and Result Page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/dashboard');
  await page.evaluate(() => {
    const kpId = 'KP-FINAL-DEMO';
    const sampleId = 'SMP-01';
    const runId = 'TR-01';
    const mockKp = {
      id: kpId,
      productId: 'prod-01',
      productSnapshot: { productCode: 'PRD-FM100', productName: 'Fine Mist 100 mL' },
      productLot: 'LOT-2026-FINAL',
      testPeriod: 'T0',
      status: 'ACTIVE',
      operatorId: 'usr-np',
      operatorName: 'Nadia Putri',
      formulaNumber: 'FM-100-A',
      storageCondition: 'Ruang',
      bottlePosition: 'Tegak',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      samples: [
        {
          id: sampleId,
          kodePengujianId: kpId,
          sampleCode: 'SMP-01',
          positionInRun: 1,
          status: 'TESTED',
          storageCondition: 'Ruang',
          bottlePosition: 'Tegak',
          deviceConfiguration: { deviceType: 'Non-Aerosol', bottleHeightMm: 120, strokeMm: 8.5 },
          notes: 'Sampel uji lab',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ],
      testRuns: [
        {
          id: runId,
          kodePengujianId: kpId,
          sampleId: sampleId,
          recipeId: 'rec-01',
          recipeSnapshot: { name: 'Standard Spray Test', forceSetpointN: 35.0, pressDurationMs: 1500, strokeMm: 8.5 },
          setpoints: { forceSetpointN: 35.0, pressDurationMs: 1500, strokeMm: 8.5 },
          fixture: 'nominal-01',
          operatorId: 'usr-np',
          operatorName: 'Nadia Putri',
          status: 'FINALIZED',
          repetitionIndex: 1,
          completedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          captureSession: {
            captureMode: 'simulation',
            synchronizedMoments: [
              { captureMomentId: 'm-1', frameIndex: 24, timestampMs: 1200, phase: 'stable' }
            ]
          },
          finalReport: {
            testId: runId,
            status: 'FINALIZED',
            perspectives: ['side'],
            primaryCaptureMomentId: 'm-1',
            primaryCapture: {
              frameIndex: 24,
              timestampMs: 1200,
              phase: 'stable',
            },
            supportingCaptureMomentIds: ['m-2', 'm-3'],
            supportingCaptures: [
              { captureMomentId: 'm-2', frameIndex: 18, timestampMs: 900, phase: 'build-up' },
              { captureMomentId: 'm-3', frameIndex: 30, timestampMs: 1500, phase: 'decay' },
            ],
            analysisSource: 'simulation',
            side: {
              sprayLength: { auto: 245.5, final: 248.0, adjusted: true },
              sprayAngle: { auto: 32.1, final: 32.1, adjusted: false },
              verticalSpread: { auto: 55.0, final: 55.0, adjusted: false },
              directionOffset: { auto: 0.5, final: 0.5, adjusted: false },
              calibration: {
                camera: 'side',
                referenceDistanceMm: 1000,
                scaleMmPerPx: 0.523,
                anchorA: { x: 112, y: 296 },
                anchorB: { x: 634, y: 296 },
                adjusted: false,
              },
              autoGeometry: {
                nozzleOriginPx: { x: 120, y: 300 },
                sprayEndpointPx: { x: 500, y: 300 },
                upperBoundaryPx: { x: 450, y: 220 },
                lowerBoundaryPx: { x: 450, y: 380 },
                verticalSpreadTopPx: { x: 350, y: 240 },
                verticalSpreadBottomPx: { x: 350, y: 360 },
                directionReferencePx: { x: 500, y: 300 },
              },
              finalGeometry: {
                nozzleOriginPx: { x: 120, y: 300 },
                sprayEndpointPx: { x: 505, y: 300 },
                upperBoundaryPx: { x: 450, y: 220 },
                lowerBoundaryPx: { x: 450, y: 380 },
                verticalSpreadTopPx: { x: 350, y: 240 },
                verticalSpreadBottomPx: { x: 350, y: 360 },
                directionReferencePx: { x: 505, y: 300 },
              }
            },
            operationalMetrics: {
              measurements: {
                initialGrossWeightG: 45.230,
                finalGrossWeightG: 44.110,
                actualPressDurationS: 1.48,
                leakage: 'Tidak',
              },
              derived: {
                dischargedMassG: 1.120,
                dischargeRateGPerS: 0.757,
              }
            },
            finalizedBy: 'Nadia Putri',
            finalizedAt: new Date().toISOString(),
          }
        }
      ]
    };
    const key = 'spraybot.kodePengujian.v1';
    const existing = JSON.parse(window.localStorage.getItem(key) || '[]');
    window.localStorage.setItem(key, JSON.stringify([mockKp, ...existing.filter((k: any) => k.id !== kpId)]));
  });

  // 1. Visit Finalized Result Page
  await page.goto('/kode-pengujian/KP-FINAL-DEMO/samples/SMP-01/runs/TR-01/result');
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: path.join(outDir, 'test_run_result_1440x900.png'),
    fullPage: false,
  });

  // 2. Visit Finalized Wizard Step 05
  await page.goto('/kode-pengujian/KP-FINAL-DEMO/samples/SMP-01/runs/TR-01/execute?step=5');
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: path.join(outDir, 'wizard_step05_finalized_1440x900.png'),
    fullPage: false,
  });
});
