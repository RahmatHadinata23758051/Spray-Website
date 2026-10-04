import { test, expect } from '@playwright/test';

test.describe('Phase D4 — Contextual Batch Result E2E', () => {
  test('complete flow: Seeded Batch -> Capture -> Analysis -> Finalize -> Batch Detail -> Result -> Reload Result', async ({ page }) => {
    // 1. Sign in and navigate to Batches
    await page.goto('/');
    await page.getByRole('button', { name: 'Masuk' }).click();
    await page.getByRole('button', { name: 'Batch', exact: true }).click();

    // 2. Open first READY batch (BAT-24-0618)
    await expect(page.getByText('BAT-24-0618')).toBeVisible();
    await page.getByRole('button', { name: 'Buka Batch' }).first().click();

    // 3. Start Capture workspace
    await expect(page.getByRole('button', { name: 'Mulai / Buka Pengambilan' })).toBeVisible();
    await page.getByRole('button', { name: 'Mulai / Buka Pengambilan' }).click();

    // Run capture acquisition
    await expect(page.getByRole('button', { name: 'Mulai Pengambilan' })).toBeVisible();
    await page.getByRole('button', { name: 'Mulai Pengambilan' }).click();

    // 4. Returned to Batch Detail in REVIEW_REQUIRED state
    await expect(page.getByText('Perlu Ditinjau').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Tinjau Analisis' })).toBeVisible();
    await page.getByRole('button', { name: 'Tinjau Analisis' }).click();

    // 5. In Analysis workspace: Set Primary capture and add Supporting capture
    await expect(page).toHaveURL(/\/batches\/BAT-24-0618\/analysis$/);
    await page.getByRole('button', { name: 'Jadikan Utama' }).click();
    await expect(page.getByText('★ Utama')).toBeVisible();

    // Add supporting capture
    await page.getByRole('button', { name: /Tangkapan 27 1350 ms/ }).click();
    await page.getByRole('button', { name: 'Tambah Pendukung' }).click();

    // 6. Confirm Final Analysis
    await page.getByRole('button', { name: 'Finalisasi Analisis' }).click();

    // 7. Returned to Batch Detail page in FINALIZED state
    await expect(page).toHaveURL(/\/batches\/BAT-24-0618$/);
    await expect(page.getByText('Final', { exact: true })).toBeVisible();

    // 8. Open Contextual Result Page
    await expect(page.getByRole('button', { name: 'Lihat Hasil' })).toBeVisible();
    await page.getByRole('button', { name: 'Lihat Hasil' }).click();

    // 9. Verify canonical route /batches/BAT-24-0618/result
    await expect(page).toHaveURL(/\/batches\/BAT-24-0618\/result$/);
    await expect(page.getByText('Final', { exact: true })).toBeVisible();
    await expect(page.getByText('BAT-24-0618').first()).toBeVisible();
    await expect(page.getByText('Hasil Kamera Samping')).toBeVisible();
    await expect(page.getByText('Hasil Kamera Depan')).toBeVisible();
    await expect(page.getByText('Tangkapan Utama').first()).toBeVisible();
    await expect(page.getByText('Tangkapan Pendukung')).toBeVisible();

    // 10. Perform Hard Reload on Result Page and verify stability of finalized values
    await page.reload();

    await expect(page).toHaveURL(/\/batches\/BAT-24-0618\/result$/);
    await expect(page.getByText('Final', { exact: true })).toBeVisible();
    await expect(page.getByText('BAT-24-0618').first()).toBeVisible();
    await expect(page.getByText('Hasil Kamera Samping')).toBeVisible();
    await expect(page.getByText('Hasil Kamera Depan')).toBeVisible();
    await expect(page.getByText('Tangkapan Utama').first()).toBeVisible();
    await expect(page.getByText('Tangkapan Pendukung')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ekspor CSV' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Jadikan Utama' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Finalisasi Analisis' })).toHaveCount(0);
  });
});
