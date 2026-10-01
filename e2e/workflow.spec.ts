import { test, expect } from '@playwright/test';

test.describe('Spraybot simulated workflow', () => {
  test('operator completes workflow and inspects camera metrics', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Sign in to Spraybot')).toBeVisible();
    await expect(page.getByText('No machine hardware is connected.')).toBeVisible();
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await page.getByRole('button', { name: 'Batches' }).click();
    await page.getByRole('button', { name: 'Open Batch' }).first().click();
    await page.getByRole('button', { name: 'Start / Open Capture' }).click();
    await page.getByRole('button', { name: 'Start Capture' }).click();
    await expect(page.getByText('REVIEW_REQUIRED')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Review Analysis' }).click();

    await expect(page.getByText('Capture timeline', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Capture 27 1350 ms Stable' }).click();
    await expect(page.getByTestId('inspector-side-spray-length')).toHaveText('46.7 cm');
    await page.getByRole('button', { name: 'Set as Primary' }).click();
    await expect(page.getByText('★ Primary')).toBeVisible();

    await page.getByRole('button', { name: 'front camera' }).click();
    await expect(page.getByText('Spray area', { exact: true })).toBeVisible();
    await expect(page.getByText('Horizontal symmetry')).toBeVisible();
    await expect(page.getByText('Vertical symmetry')).toBeVisible();
    await expect(page.getByText('★ Primary')).toBeVisible();
    await expect(page.getByRole('button', { name: /rear camera/i })).toHaveCount(0);
  });

  test('batches displays batches from repository and can open batch detail', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('button', { name: 'Batches' }).click();
    await expect(page.getByRole('heading', { name: 'Batches' }).first()).toBeVisible();
    await expect(page.getByText('BAT-24-0618')).toBeVisible();
    await page.getByRole('button', { name: 'Open Batch' }).first().click();
    await expect(page.getByRole('heading', { name: 'BAT-24-0618' })).toBeVisible();
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

  async function navigateToAnalysis(page: any) {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('button', { name: 'Batches' }).click();
    await page.getByRole('button', { name: 'Open Batch' }).first().click();
    await page.getByRole('button', { name: 'Start / Open Capture' }).click();
    await page.getByRole('button', { name: 'Start Capture' }).click();
    await expect(page.getByText('REVIEW_REQUIRED')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Review Analysis' }).click();
  }

  test('direct manipulation calibration supports live drag, translation, cancel, apply, keyboard, and camera independence', async ({ page }) => {
    await navigateToAnalysis(page);

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
    await navigateToAnalysis(page);

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
    await page.getByRole('button', { name: /Capture 28 1400 ms/ }).click();
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
    await navigateToAnalysis(page);

    await expect(page.getByText('Select exactly one Primary Capture Moment before confirmation.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm Final Analysis' })).toBeDisabled();

    await page.getByRole('button', { name: 'Set as Primary' }).click();
    await expect(page.getByText('Primary Capture', { exact: true })).toBeVisible();
    await expect(page.getByText('#028 · 1400 ms', { exact: true })).toBeVisible();
    await expect(page.getByText('Side Camera final')).toBeVisible();
    await expect(page.getByText('Front Camera final')).toBeVisible();
    await expect(page.getByText('Selected Captures', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm Final Analysis' }).click();
    await expect(page.getByText('FINALIZED', { exact: true })).toBeVisible();
  });

  test('capture selection: Primary, Supporting, remove, shared across tabs', async ({ page }) => {
    await navigateToAnalysis(page);

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
    await navigateToAnalysis(page);

    // Set primary and finalize
    await page.getByRole('button', { name: 'Set as Primary' }).click();
    await page.getByRole('button', { name: 'Capture 26 1300 ms Stable' }).click();
    await page.getByRole('button', { name: 'Add Supporting' }).click();
    await page.getByRole('button', { name: /Capture 28 1400 ms/ }).click();
    await page.getByRole('button', { name: 'Confirm Final Analysis' }).click();
    await expect(page.getByText('FINALIZED', { exact: true })).toBeVisible();

    // Navigate to Result page
    await page.getByRole('button', { name: 'View Result' }).click();

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

    // Navigate to Reports via sidebar
    await page.getByRole('button', { name: 'Reports' }).click();
    const report = page.locator('.report-v2');
    await expect(report.getByText('Finalization')).toBeVisible();
  });

  test('measurement tool modes for Side Camera provide focused interactions and preserve edits', async ({ page }) => {
    await navigateToAnalysis(page);

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

  test('Dashboard and History align with analysis lifecycle', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Verify Dashboard shows latest/current batch
    await expect(page.getByRole('heading', { name: 'Current / Latest Batch' })).toBeVisible();
    await expect(page.getByText('Temporal stability')).toHaveCount(0);
    await expect(page.getByText('BAT-24-0618').first()).toBeVisible();

    // Open Batch from Dashboard
    await page.getByRole('button', { name: 'View Batch' }).click();
    await expect(page.getByRole('heading', { name: 'Capture — BAT-24-0618' })).toBeVisible();

    // Capture and proceed to Analysis
    await page.getByRole('button', { name: 'Start Capture' }).click();
    await expect(page.getByText('REVIEW_REQUIRED')).toBeVisible({ timeout: 15000 });

    // Review Analysis
    await page.getByRole('button', { name: 'Review Analysis' }).click();
    await expect(page.getByRole('heading', { name: 'Analysis', exact: true })).toBeVisible();

    // Finalize
    await page.getByRole('button', { name: 'Set as Primary' }).click();
    await page.getByRole('button', { name: 'Confirm Final Analysis' }).click();
    await expect(page.getByRole('heading', { name: 'BAT-24-0618' })).toBeVisible();

    // Go back to Dashboard
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Recent Finalized Batches' })).toBeVisible();

    // Recent finalized batches row has batch ID
    const finalizedRow = page.locator('table').locator('tr', { hasText: 'BAT-24-0618' }).first();
    await expect(finalizedRow.getByText('BAT-24-0618')).toBeVisible();

    // Go to Batches
    await page.getByRole('button', { name: 'Batches' }).click();
    await expect(page.getByRole('heading', { name: 'Batches' }).first()).toBeVisible();
    
    // 1. Batches contains no Rear Camera fields.
    // 2. Batches contains no Rear Validity.
    await expect(page.getByText('Rear Validity')).toHaveCount(0);
    await expect(page.getByText('Bottle alignment')).toHaveCount(0);
    
    const batchRow = page.getByRole('row', { name: /BAT-24-0618/ });
    await expect(batchRow).toBeVisible();
    await batchRow.getByRole('button', { name: 'Open Batch' }).click();
    await expect(page.getByRole('heading', { name: 'BAT-24-0618' })).toBeVisible();
  });
});

