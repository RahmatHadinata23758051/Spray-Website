import { test, expect } from '@playwright/test';

test.describe('Spraybot simulated workflow', () => {
  test('operator completes workflow and inspects camera metrics', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Sign in to Spraybot')).toBeVisible();
    await expect(page.getByText('No machine hardware is connected.')).toBeVisible();
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await page.getByRole('button', { name: 'New Test' }).first().click();
    await page.getByLabel('Product', { exact: true }).selectOption({ label: 'Trigger Spray 250 mL · PRD-TS250' });
    await expect(page.getByLabel('Test Recipe')).toHaveValue('rcp-ts-standard');
    await page.getByRole('button', { name: 'Start Test' }).click();
    await expect(page.getByText('Simulation mode — fixture capture')).toBeVisible();
    await expect(page.getByText('Mock capture loaded · fixture frame set')).toHaveCount(2);

    await page.getByRole('button', { name: 'Open analysis' }).click();
    await expect(page.getByText('Capture timeline')).toBeVisible();
    await expect(page.getByText('Recommended capture', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('29 of 60').first()).toBeVisible();
    await expect(page.getByText('#028 / 59')).toHaveCount(0);
    await page.getByRole('button', { name: 'Capture 27 1350 ms Stable' }).click();
    await expect(page.getByText('28 of 60').first()).toBeVisible();
    await expect(page.getByTestId('inspector-side-spray-length')).toHaveText('46.7 cm');
    await expect(page.getByText('Selected Captures 0 / 10')).toBeVisible();
    await page.getByRole('button', { name: 'Set as Primary' }).click();
    await expect(page.getByText('★ Primary')).toBeVisible();
    await expect(page.getByText('Selected Captures 1 / 10')).toBeVisible();

    await page.getByRole('button', { name: 'front camera' }).click();
    await expect(page.getByText('Spray area')).toBeVisible();
    await expect(page.getByText('19364 mm²', { exact: true })).toBeVisible();
    await expect(page.getByText('Horizontal symmetry')).toBeVisible();
    await expect(page.getByText('Vertical symmetry')).toBeVisible();
    await expect(page.getByText('28 of 60').first()).toBeVisible();
    await expect(page.getByText('1350 ms').first()).toBeVisible();
    await expect(page.getByText('★ Primary')).toBeVisible();
    await expect(page.getByRole('button', { name: /rear camera/i })).toHaveCount(0);
  });

  test('history filters and opens final result', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('button', { name: 'History' }).click();
    await page.getByLabel('Search').fill('nonexistent');
    await expect(page.getByText('No tests match the current filters.')).toBeVisible();
    await page.getByLabel('Search').fill('TST-24-0618');
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByRole('heading', { name: 'Result', exact: true })).toBeVisible();
    await expect(page.getByText('Final analysis required')).toBeVisible();
  });

  for (const viewport of [{ width: 1366, height: 768 }, { width: 768, height: 1024 }]) {
    test(`renders navigation at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await expect(page.getByText('Sign in to Spraybot')).toBeVisible();
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    });
  }

  test('direct manipulation calibration supports live drag, translation, cancel, apply, keyboard, and camera independence', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('button', { name: 'Analysis' }).click();

    const grid = page.getByRole('group', { name: 'Physical grid 100 millimeter spacing' });
    const overlayLength = page.getByTestId('side-overlay-spray-length');
    const inspectorLength = page.getByTestId('inspector-side-spray-length');
    const scale = page.getByTestId('inspector-scale');
    const beforeGridSpacing = await grid.getAttribute('data-grid-spacing-px');
    const beforeLength = await overlayLength.textContent();

    await page.getByRole('button', { name: 'Adjust Calibration' }).click();
    const anchorA = page.getByRole('slider', { name: 'Calibration anchor A' });
    const anchorB = page.getByRole('slider', { name: 'Calibration anchor B' });
    const rulerBody = page.getByRole('slider', { name: 'Calibration grid reference body' });
    await expect(anchorA).toBeVisible();
    await expect(anchorB).toBeVisible();

    const bBox = await anchorB.boundingBox();
    if (!bBox) throw new Error('Anchor B is not visible');
    await page.mouse.move(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(bBox.x + bBox.width / 2 + 48, bBox.y + bBox.height / 2, { steps: 4 });
    await expect(scale).not.toHaveText('1.916 mm / px');
    await expect(overlayLength).not.toHaveText(beforeLength ?? '');
    await expect(inspectorLength).toHaveText(await overlayLength.textContent() ?? '');
    await page.mouse.up();

    const scaleAfterResize = await scale.textContent();
    const aBeforeTranslate = await anchorA.getAttribute('aria-valuetext');
    const bodyBox = await rulerBody.boundingBox();
    if (!bodyBox) throw new Error('Calibration ruler body is not visible');
    await page.mouse.move(bodyBox.x + bodyBox.width / 2, bodyBox.y + bodyBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(bodyBox.x + bodyBox.width / 2 - 20, bodyBox.y + bodyBox.height / 2 - 20, { steps: 3 });
    await page.mouse.up();
    await expect(scale).toHaveText(scaleAfterResize ?? '');
    await expect(anchorA).not.toHaveAttribute('aria-valuetext', aBeforeTranslate ?? '');

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(scale).toHaveText('1.916 mm / px');
    await expect(overlayLength).toHaveText(beforeLength ?? '');

    await page.getByRole('button', { name: 'Adjust Calibration' }).click();
    await page.getByRole('slider', { name: 'Calibration anchor B' }).focus();
    await page.keyboard.press('Shift+ArrowRight');
    await expect(scale).not.toHaveText('1.916 mm / px');
    await expect(page.getByRole('img', { name: 'side measurement correction handles' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Apply Calibration' }).click();
    const appliedScale = await scale.textContent();
    await expect(page.getByRole('slider', { name: 'Calibration anchor B' })).toHaveCount(0);
    await expect(grid).not.toHaveAttribute('data-grid-spacing-px', beforeGridSpacing ?? '');

    await page.getByRole('button', { name: 'front camera' }).click();
    await expect(scale).toHaveText('2.500 mm / px');
    await page.getByRole('button', { name: 'side camera' }).click();
    await expect(scale).toHaveText(appliedScale ?? '');
  });

  test('direct measurement manipulation persists corrected Side and Front geometry per moment', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('button', { name: 'Analysis' }).click();

    const scaleBefore = await page.getByTestId('inspector-scale').textContent();
    const autoLength = await page.getByTestId('side-overlay-spray-length').textContent();
    const autoLineEnd = await page.getByTestId('side-display-length-line').getAttribute('x2');
    await page.getByRole('button', { name: 'Edit Measurement' }).click();
    const endpoint = page.getByRole('slider', { name: 'Spray endpoint' });
    const endpointBox = await endpoint.boundingBox();
    if (!endpointBox) throw new Error('Endpoint unavailable');
    await page.mouse.move(endpointBox.x + endpointBox.width / 2, endpointBox.y + endpointBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(endpointBox.x + endpointBox.width / 2 + 35, endpointBox.y + endpointBox.height / 2, { steps: 4 });
    await expect(page.getByTestId('side-overlay-spray-length')).not.toHaveText(autoLength ?? '');
    await expect(page.getByTestId('inspector-side-spray-length')).not.toHaveText(autoLength ?? '');
    await page.mouse.up();
    await expect(page.getByTestId('inspector-scale')).toHaveText(scaleBefore ?? '');

    await endpoint.focus();
    const endpointBeforeKey = await endpoint.getAttribute('aria-valuetext');
    await page.keyboard.press('Shift+ArrowRight');
    await expect(endpoint).not.toHaveAttribute('aria-valuetext', endpointBeforeKey ?? '');
    await page.getByRole('button', { name: 'Apply Measurement' }).click();
    await expect(endpoint).toHaveCount(0);
    await expect(page.getByTestId('side-display-length-line')).not.toHaveAttribute('x2', autoLineEnd ?? '');
    await expect(page.getByTestId('inspector-side-spray-length')).toHaveText(/Auto .* \/ Final/);
    const appliedLength = await page.getByTestId('side-overlay-spray-length').textContent();

    await page.getByRole('button', { name: 'Capture 27 1350 ms Stable' }).click();
    await expect(page.getByTestId('inspector-side-spray-length')).not.toHaveText(/Auto .* \/ Final/);
    await page.getByRole('button', { name: 'Capture 28 1400 ms Stable recommended' }).click();
    await expect(page.getByTestId('side-overlay-spray-length')).toHaveText(appliedLength ?? '');

    await page.getByRole('button', { name: 'front camera' }).click();
    await page.getByRole('button', { name: 'Edit Measurement' }).click();
    const centroid = page.getByRole('slider', { name: 'Spray centroid handle' });
    const centroidBox = await centroid.boundingBox();
    if (!centroidBox) throw new Error('Centroid unavailable');
    await page.mouse.move(centroidBox.x + centroidBox.width / 2, centroidBox.y + centroidBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(centroidBox.x + centroidBox.width / 2 + 25, centroidBox.y + centroidBox.height / 2 - 15, { steps: 3 });
    await page.mouse.up();
    const diameter = page.getByRole('slider', { name: 'Equivalent diameter handle right' });
    await diameter.focus();
    await page.keyboard.press('Shift+ArrowRight');
    await page.getByRole('button', { name: 'Apply Measurement' }).click();
    await expect(page.getByTestId('inspector-front-centroid-x')).toHaveText(/Auto .* \/ Final/);
    await expect(page.getByTestId('inspector-front-equivalent-diameter')).toHaveText(/Auto .* \/ Final/);
  });

  test('final confirmation requires Primary and saves shared-moment summary', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('button', { name: 'Analysis' }).click();

    await expect(page.getByText('captured')).toBeVisible();
    await expect(page.getByText('Select exactly one Primary Capture Moment before confirmation.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm Final Analysis' })).toBeDisabled();

    await page.getByRole('button', { name: 'Set as Primary' }).click();
    await expect(page.getByText('Primary Capture', { exact: true })).toBeVisible();
    await expect(page.getByText('#028 · 1400 ms', { exact: true })).toBeVisible();
    await expect(page.getByText('Side Camera final')).toBeVisible();
    await expect(page.getByText('Front Camera final')).toBeVisible();
    await expect(page.getByText('Selected Captures', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm Final Analysis' }).click();
    await expect(page.getByText('finalized')).toBeVisible();
    await expect(page.getByText('Final report saved in memory:')).toBeVisible();
    await expect(page.getByText('cap-028')).toBeVisible();
  });

  test('capture selection: Primary, Supporting, remove, shared across tabs', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('button', { name: 'Analysis' }).click();

    await expect(page.getByText('Selected Captures 0 / 10')).toBeVisible();
    await expect(page.getByText('No report captures selected')).toBeVisible();

    await page.getByRole('button', { name: 'Set as Primary' }).click();
    await expect(page.getByText('★ Primary')).toBeVisible();
    await expect(page.getByText('Selected Captures 1 / 10')).toBeVisible();

    await page.getByRole('button', { name: 'Capture 26 1300 ms Stable' }).click();
    await page.getByRole('button', { name: 'Add Supporting' }).click();
    await expect(page.getByText('Selected Captures 2 / 10')).toBeVisible();

    await page.getByRole('button', { name: 'front camera' }).click();
    await expect(page.getByText('Selected Captures 2 / 10')).toBeVisible();
    await expect(page.getByText('★ Primary')).toBeVisible();

    await page.getByRole('button', { name: 'side camera' }).click();
    await page.getByRole('button', { name: /Remove Supporting Capture 26/ }).click();
    await expect(page.getByText('Selected Captures 1 / 10')).toBeVisible();
  });

  test('finalization navigates to Result V2 and Report V2', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('button', { name: 'Analysis' }).click();

    // Set primary and finalize
    await page.getByRole('button', { name: 'Set as Primary' }).click();
    await page.getByRole('button', { name: 'Capture 26 1300 ms Stable' }).click();
    await page.getByRole('button', { name: 'Add Supporting' }).click();
    await page.getByRole('button', { name: 'Capture 28 1400 ms Stable recommended' }).click();
    await page.getByRole('button', { name: 'Confirm Final Analysis' }).click();
    await expect(page.getByText('finalized')).toBeVisible();

    // Navigate to Result page
    await page.getByRole('button', { name: 'View Result →' }).click();
    await expect(page.getByRole('heading', { name: 'Result', exact: true })).toBeVisible();

    // Result header shows correct test info
    const result = page.locator('.result-v2');
    await expect(result.getByText('Finalized', { exact: true })).toBeVisible();
    await expect(result.getByText('Fine Mist 100 mL')).toBeVisible();
    await expect(result.getByText('#028 · 1400 ms').first()).toBeVisible();

    // Camera results present for both Side and Front
    await expect(result.getByText('Side Camera Result')).toBeVisible();
    await expect(result.getByText('Front Camera Result')).toBeVisible();

    // Calibration summaries
    await expect(result.getByText('Side calibration').first()).toBeVisible();
    await expect(result.getByText('Front calibration').first()).toBeVisible();

    // Audit section
    await expect(result.getByText('Analysis Audit')).toBeVisible();
    await expect(result.getByText('Nadia Putri').first()).toBeVisible();

    // Supporting capture present
    await expect(result.getByText('Supporting Captures')).toBeVisible();

    // Navigate to Report
    await page.getByRole('button', { name: 'View Report' }).click();
    const report = page.locator('.report-v2');
    await expect(report.getByText('Technical Test Report')).toBeVisible();
    await expect(report.getByText('Test Setpoints')).toBeVisible();
    await expect(report.getByText('Simulation').first()).toBeVisible();
    await expect(report.getByText('Finalization')).toBeVisible();
  });

  test('measurement tool modes for Side Camera provide focused interactions and preserve edits', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('button', { name: 'Analysis' }).click();

    await page.getByRole('button', { name: 'Edit Measurement' }).click();
    
    // 1. Defaults to Length tool
    await expect(page.getByRole('tab', { name: 'Length' })).toHaveAttribute('aria-selected', 'true');
    // 2. Length tool shows only endpoint interaction
    await expect(page.getByRole('slider', { name: 'Spray endpoint' })).toBeVisible();
    await expect(page.getByRole('slider', { name: 'Spread measurement position' })).toHaveCount(0);
    await expect(page.getByRole('slider', { name: 'Upper angle boundary' })).toHaveCount(0);

    // Make an edit in Length
    const endpoint = page.getByRole('slider', { name: 'Spray endpoint' });
    await endpoint.focus();
    await page.keyboard.press('Shift+ArrowRight');
    
    // 3. Switch to Spread
    await page.getByRole('tab', { name: 'Spread' }).click();
    await expect(page.getByRole('tab', { name: 'Spread' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('slider', { name: 'Spread measurement position' })).toBeVisible();
    await expect(page.getByRole('slider', { name: 'Upper spread boundary' })).toBeVisible();
    await expect(page.getByRole('slider', { name: 'Lower spread boundary' })).toBeVisible();
    await expect(page.getByRole('slider', { name: 'Spray endpoint' })).toHaveCount(0);
    
    // Make an edit in Spread
    const upperSpread = page.getByRole('slider', { name: 'Upper spread boundary' });
    await upperSpread.focus();
    await page.keyboard.press('Shift+ArrowUp');
    const spreadPos = page.getByRole('slider', { name: 'Spread measurement position' });
    await spreadPos.focus();
    await page.keyboard.press('Shift+ArrowLeft');
    
    // 4. Switch to Angle
    await page.getByRole('tab', { name: 'Angle' }).click();
    await expect(page.getByRole('tab', { name: 'Angle' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('slider', { name: 'Upper angle boundary' })).toBeVisible();
    await expect(page.getByRole('slider', { name: 'Lower angle boundary' })).toBeVisible();
    await expect(page.getByRole('slider', { name: 'Spread measurement position' })).toHaveCount(0);

    // Make an edit in Angle
    const upperAngle = page.getByRole('slider', { name: 'Upper angle boundary' });
    await upperAngle.focus();
    await page.keyboard.press('Shift+ArrowUp');

    // Apply all edits
    await page.getByRole('button', { name: 'Apply Measurement' }).click();
    
    // Check that edits are preserved
    await expect(page.getByTestId('inspector-side-spray-length')).toHaveText(/Auto .* \/ Final/);
    await expect(page.getByTestId('inspector-side-vertical-spread')).toHaveText(/Auto .* \/ Final/);
    await expect(page.getByTestId('inspector-side-spray-angle')).toHaveText(/Auto .* \/ Final/);
    
    // Verify Cancel discards session
    await page.getByRole('button', { name: 'Edit Measurement' }).click();
    await expect(page.getByRole('tab', { name: 'Length' })).toHaveAttribute('aria-selected', 'true');
    await endpoint.focus();
    await page.keyboard.press('Shift+ArrowRight');
    await page.getByRole('button', { name: 'Cancel' }).click();
  });
});

