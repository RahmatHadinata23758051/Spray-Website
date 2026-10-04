import { test, expect } from '@playwright/test';

test.describe('Phase D3 — Contextual Batch Analysis E2E', () => {
  test('operator navigates to REVIEW_REQUIRED batch analysis, manipulates draft, refreshes, and finalizes', async ({ page }) => {
    // 1. Sign in and navigate to Batches
    await page.goto('/');
    await page.getByRole('button', { name: 'Masuk' }).click();
    await page.getByRole('button', { name: 'Batch', exact: true }).click();

    // 2. Open first READY batch and drive it to REVIEW_REQUIRED
    await expect(page.getByText('BAT-24-0618')).toBeVisible();
    await page.getByRole('button', { name: 'Buka Batch' }).first().click();

    // Start Capture
    await expect(page.getByRole('button', { name: 'Mulai / Buka Pengambilan' })).toBeVisible();
    await page.getByRole('button', { name: 'Mulai / Buka Pengambilan' }).click();

    // Now in Capture Workspace, mock capture starts
    await expect(page.getByRole('button', { name: 'Mulai Pengambilan' })).toBeVisible();
    await page.getByRole('button', { name: 'Mulai Pengambilan' }).click();

    // Now back to Batch Detail automatically after capture completes
    await expect(page.getByText('Perlu Ditinjau').first()).toBeVisible({ timeout: 15000 });
    
    // Verify Review Analysis button is visible
    await expect(page.getByRole('button', { name: 'Tinjau Analisis' })).toBeVisible();
    await page.getByRole('button', { name: 'Tinjau Analisis' }).click();

    // 3. Verify route /batches/BAT-24-0618/analysis
    await expect(page).toHaveURL(/\/batches\/BAT-24-0618\/analysis$/);
    await expect(page.getByText('Batch: BAT-24-0618')).toBeVisible();

    // 4. Primary selection & Supporting selection
    await expect(page.getByText('Tangkapan Dipilih 0 / 10')).toBeVisible();
    await page.getByRole('button', { name: 'Jadikan Utama' }).click();
    await expect(page.getByText('★ Utama')).toBeVisible();
    await expect(page.getByText('Tangkapan Dipilih 1 / 10')).toBeVisible();

    // Select second capture and add as supporting
    await page.getByRole('button', { name: /Tangkapan 27 1350 ms/ }).click();
    await page.getByRole('button', { name: 'Tambah Pendukung' }).click();
    await expect(page.getByText('Tangkapan Dipilih 2 / 10')).toBeVisible();

    // 5. Test Hard Refresh persistence
    await page.reload();
    await expect(page.getByText('Batch: BAT-24-0618')).toBeVisible();
    await expect(page.getByText('Tangkapan Dipilih 2 / 10')).toBeVisible();
    await expect(page.getByText('★ Utama')).toBeVisible();

    // 6. Test Calibration adjustment
    await page.getByRole('button', { name: 'Atur Kalibrasi' }).click();
    await page.getByRole('slider', { name: 'Jangkar kalibrasi B' }).focus();
    await page.keyboard.press('Shift+ArrowRight');
    await page.getByRole('button', { name: 'Terapkan Kalibrasi' }).click();

    // Hard refresh to ensure calibration persisted
    await page.reload();
    await expect(page.getByText('Disesuaikan oleh Operator').first()).toBeVisible();

    // 7. Finalize batch analysis
    await page.getByRole('button', { name: 'Finalisasi Analisis' }).click();

    // 8. Should redirect to Batch Detail page and show FINALIZED status
    await expect(page).toHaveURL(/\/batches\/BAT-24-0618$/);
    await expect(page.getByText('Final', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lihat Hasil' })).toBeVisible();

    // 9. Re-open Result for FINALIZED batch -> Read-Only mode
    await page.getByRole('button', { name: 'Lihat Hasil' }).click();
    await expect(page).toHaveURL(/\/batches\/BAT-24-0618\/result$/);
    await expect(page.getByText('Final', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Jadikan Utama' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Finalisasi Analisis' })).toHaveCount(0);
  });
});
