import { test, expect } from '@playwright/test';

test.describe('Phase D3 — Contextual Batch Analysis E2E', () => {
  test('operator navigates to REVIEW_REQUIRED batch analysis, manipulates draft, refreshes, and finalizes', async ({ page }) => {
    // 1. Sign in and navigate to Batches
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('button', { name: 'Batches' }).click();

    // 2. Open first READY batch and drive it to REVIEW_REQUIRED
    await expect(page.getByText('BAT-24-0618')).toBeVisible();
    await page.getByRole('button', { name: 'Open Batch' }).first().click();

    // Start Capture
    await expect(page.getByRole('button', { name: 'Start / Open Capture' })).toBeVisible();
    await page.getByRole('button', { name: 'Start / Open Capture' }).click();

    // Now in Capture Workspace, mock capture starts
    await expect(page.getByRole('button', { name: 'Start Capture' })).toBeVisible();
    await page.getByRole('button', { name: 'Start Capture' }).click();

    // Now back to Batch Detail automatically after capture completes
    await expect(page.getByText('REVIEW_REQUIRED')).toBeVisible({ timeout: 15000 });
    
    // Verify Review Analysis button is visible
    await expect(page.getByRole('button', { name: 'Review Analysis' })).toBeVisible();
    await page.getByRole('button', { name: 'Review Analysis' }).click();

    // 3. Verify route /batches/BAT-24-0618/analysis
    await expect(page).toHaveURL(/\/batches\/BAT-24-0618\/analysis$/);
    await expect(page.getByText('Batch: BAT-24-0618')).toBeVisible();

    // 4. Primary selection & Supporting selection
    await expect(page.getByText('Selected Captures 0 / 10')).toBeVisible();
    await page.getByRole('button', { name: 'Set as Primary' }).click();
    await expect(page.getByText('★ Primary')).toBeVisible();
    await expect(page.getByText('Selected Captures 1 / 10')).toBeVisible();

    // Select second capture and add as supporting
    await page.getByRole('button', { name: 'Capture 27 1350 ms Stable' }).click();
    await page.getByRole('button', { name: 'Add Supporting' }).click();
    await expect(page.getByText('Selected Captures 2 / 10')).toBeVisible();

    // 5. Test Hard Refresh persistence
    await page.reload();
    await expect(page.getByText('Batch: BAT-24-0618')).toBeVisible();
    await expect(page.getByText('Selected Captures 2 / 10')).toBeVisible();
    await expect(page.getByText('★ Primary')).toBeVisible();

    // 6. Test Calibration adjustment
    await page.getByRole('button', { name: 'Adjust Calibration' }).click();
    await page.getByRole('slider', { name: 'Calibration anchor B' }).focus();
    await page.keyboard.press('Shift+ArrowRight');
    await page.getByRole('button', { name: 'Apply Calibration' }).click();

    // Hard refresh to ensure calibration persisted
    await page.reload();
    await expect(page.getByText('Adjusted by Operator').first()).toBeVisible();

    // 7. Finalize batch analysis
    await page.getByRole('button', { name: 'Confirm Final Analysis' }).click();

    // 8. Should redirect to Batch Detail page and show FINALIZED status
    await expect(page).toHaveURL(/\/batches\/BAT-24-0618$/);
    await expect(page.getByText('FINALIZED', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'View Analysis (Read-Only)' })).toBeVisible();

    // 9. Re-open Analysis for FINALIZED batch -> Read-Only mode
    await page.getByRole('button', { name: 'View Analysis (Read-Only)' }).click();
    await expect(page).toHaveURL(/\/batches\/BAT-24-0618\/analysis$/);
    await expect(page.getByText('READ ONLY')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Set as Primary' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Adjust Calibration' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit Measurement' })).toHaveCount(0);
  });
});
