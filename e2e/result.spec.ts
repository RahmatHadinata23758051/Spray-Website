import { test, expect } from '@playwright/test';

test.describe('Phase D4 — Contextual Batch Result E2E', () => {
  test('complete flow: Seeded Batch -> Capture -> Analysis -> Finalize -> Batch Detail -> Result -> Reload Result', async ({ page }) => {
    // 1. Sign in and navigate to Batches
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('button', { name: 'Batches' }).click();

    // 2. Open first READY batch (BAT-24-0618)
    await expect(page.getByText('BAT-24-0618')).toBeVisible();
    await page.getByRole('button', { name: 'Open Batch' }).first().click();

    // 3. Start Capture workspace
    await expect(page.getByRole('button', { name: 'Start / Open Capture' })).toBeVisible();
    await page.getByRole('button', { name: 'Start / Open Capture' }).click();

    // Run capture acquisition
    await expect(page.getByRole('button', { name: 'Start Capture' })).toBeVisible();
    await page.getByRole('button', { name: 'Start Capture' }).click();

    // 4. Returned to Batch Detail in REVIEW_REQUIRED state
    await expect(page.getByText('REVIEW_REQUIRED')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Review Analysis' })).toBeVisible();
    await page.getByRole('button', { name: 'Review Analysis' }).click();

    // 5. In Analysis workspace: Set Primary capture and add Supporting capture
    await expect(page).toHaveURL(/\/batches\/BAT-24-0618\/analysis$/);
    await page.getByRole('button', { name: 'Set as Primary' }).click();
    await expect(page.getByText('★ Primary')).toBeVisible();

    // Add supporting capture
    await page.getByRole('button', { name: 'Capture 27 1350 ms Stable' }).click();
    await page.getByRole('button', { name: 'Add Supporting' }).click();

    // 6. Confirm Final Analysis
    await page.getByRole('button', { name: 'Confirm Final Analysis' }).click();

    // 7. Returned to Batch Detail page in FINALIZED state
    await expect(page).toHaveURL(/\/batches\/BAT-24-0618$/);
    await expect(page.getByText('FINALIZED', { exact: true })).toBeVisible();

    // 8. Open Contextual Result Page
    await expect(page.getByRole('button', { name: 'View Result' })).toBeVisible();
    await page.getByRole('button', { name: 'View Result' }).click();

    // 9. Verify canonical route /batches/BAT-24-0618/result
    await expect(page).toHaveURL(/\/batches\/BAT-24-0618\/result$/);
    await expect(page.getByText('Finalized', { exact: true })).toBeVisible();
    await expect(page.getByText('BAT-24-0618').first()).toBeVisible();
    await expect(page.getByText('Side Camera Result')).toBeVisible();
    await expect(page.getByText('Front Camera Result')).toBeVisible();
    await expect(page.getByText('Primary Capture Moment')).toBeVisible();
    await expect(page.getByText('Supporting Captures')).toBeVisible();

    // 10. Perform Hard Reload on Result Page and verify stability of finalized values
    await page.reload();

    await expect(page).toHaveURL(/\/batches\/BAT-24-0618\/result$/);
    await expect(page.getByText('Finalized', { exact: true })).toBeVisible();
    await expect(page.getByText('BAT-24-0618').first()).toBeVisible();
    await expect(page.getByText('Side Camera Result')).toBeVisible();
    await expect(page.getByText('Front Camera Result')).toBeVisible();
    await expect(page.getByText('Primary Capture Moment')).toBeVisible();
    await expect(page.getByText('Supporting Captures')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Set as Primary' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Confirm Final Analysis' })).toHaveCount(0);
  });
});
