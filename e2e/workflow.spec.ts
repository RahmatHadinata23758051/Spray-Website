import { test, expect } from '@playwright/test';

test.describe('Spraybot simulated workflow', () => {
  test('operator completes workflow and inspects camera metrics', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Masuk ke Spraybot')).toBeVisible();
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(page.getByRole('heading', { name: 'Dasbor' })).toBeVisible();

    await page.getByRole('button', { name: 'Batch', exact: true }).click();
    await page.getByRole('button', { name: 'Buka Batch' }).first().click();
    await page.getByRole('button', { name: 'Mulai / Buka Pengambilan' }).click();
    await page.getByRole('button', { name: 'Mulai Pengambilan' }).click();
    await expect(page.getByText('Perlu Ditinjau').first()).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Tinjau Analisis' }).click();

    await expect(page.getByText('Linimasa akuisisi', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Tangkapan 27 1350 ms' }).click();
    await expect(page.getByTestId('inspector-side-spray-length')).toHaveText('46.7 cm');
    await page.getByRole('button', { name: 'Jadikan Utama' }).click();
    await expect(page.getByText('★ Utama')).toBeVisible();

    await page.getByRole('button', { name: 'kamera depan' }).click();
    await expect(page.getByText('Luas Semprot', { exact: true })).toBeVisible();
    await expect(page.getByText('Simetri Horizontal')).toBeVisible();
    await expect(page.getByText('Simetri Vertikal')).toBeVisible();
    await expect(page.getByText('★ Utama')).toBeVisible();
    await expect(page.getByRole('button', { name: /kamera belakang/i })).toHaveCount(0);
  });

  test('batches displays batches from repository and can open batch detail', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Masuk' }).click();
    await page.getByRole('button', { name: 'Batch', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Batch' }).first()).toBeVisible();
    await expect(page.getByText('BAT-24-0618')).toBeVisible();
    await page.getByRole('button', { name: 'Buka Batch' }).first().click();
    await expect(page.getByRole('heading', { name: 'BAT-24-0618' })).toBeVisible();
  });

  test('batches search and status filter narrow rows interactively', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Masuk' }).click();
    await page.getByRole('button', { name: 'Batch', exact: true }).click();
    
    // Select filter "Final" (domain value FINALIZED)
    const select = page.getByRole('combobox');
    await select.selectOption('FINALIZED');
    await expect(page.getByText('1 Batch')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Final' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Siap' })).toHaveCount(0);

    // Search filter
    const input = page.getByPlaceholder('Cari ID, Produk, Sampel...');
    await input.fill('TidakAdaMatch');
    await expect(page.getByText('Tidak ada batch yang sesuai dengan filter.')).toBeVisible();
    await expect(page.getByText('0 Batch')).toBeVisible();

    // Reset filter
    await input.fill('');
    await select.selectOption('');
    await expect(page.getByText(/4 Batch/)).toBeVisible();
  });

  for (const viewport of [{ width: 1366, height: 768 }, { width: 768, height: 1024 }]) {
    test(`renders navigation at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await expect(page.getByText('Masuk ke Spraybot')).toBeVisible();
      await page.getByRole('button', { name: 'Masuk' }).click();
      await expect(page.getByRole('navigation', { name: 'Navigasi Utama' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Dasbor' })).toBeVisible();
    });
  }

  async function navigateToAnalysis(page: any) {
    await page.goto('/');
    await page.getByRole('button', { name: 'Masuk' }).click();
    await page.getByRole('button', { name: 'Batch', exact: true }).click();
    await page.getByRole('button', { name: 'Buka Batch' }).first().click();
    await page.getByRole('button', { name: 'Mulai / Buka Pengambilan' }).click();
    await page.getByRole('button', { name: 'Mulai Pengambilan' }).click();
    await expect(page.getByText('Perlu Ditinjau').first()).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Tinjau Analisis' }).click();
  }

  test('direct manipulation calibration supports live drag, translation, cancel, apply, keyboard, and camera independence', async ({ page }) => {
    await navigateToAnalysis(page);

    const grid = page.getByRole('group', { name: 'Grid fisik jarak 100 milimeter' });
    const overlayPanjang = page.getByTestId('side-overlay-spray-length');
    const inspectorPanjang = page.getByTestId('inspector-side-spray-length');
    const scale = page.getByTestId('inspector-scale');
    const beforeGridSpacing = await grid.getAttribute('data-grid-spacing-px');
    const beforePanjang = await overlayPanjang.textContent();

    await page.getByRole('button', { name: 'Atur Kalibrasi' }).click();
    const anchorA = page.getByRole('slider', { name: 'Jangkar kalibrasi A' });
    const anchorB = page.getByRole('slider', { name: 'Jangkar kalibrasi B' });
    const rulerBody = page.getByRole('slider', { name: 'Badan referensi kalibrasi grid' });
    await expect(anchorA).toBeVisible();
    await expect(anchorB).toBeVisible();

    const bBox = await anchorB.boundingBox();
    if (!bBox) throw new Error('Anchor B is not visible');
    await page.mouse.move(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(bBox.x + bBox.width / 2 + 48, bBox.y + bBox.height / 2, { steps: 4 });
    await expect(scale).not.toHaveText('1.916 mm / px');
    await expect(overlayPanjang).not.toHaveText(beforePanjang ?? '');
    await expect(inspectorPanjang).toHaveText(await overlayPanjang.textContent() ?? '');
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

    await page.getByRole('button', { name: 'Batal' }).click();
    await expect(scale).toHaveText('1.916 mm / px');
    await expect(overlayPanjang).toHaveText(beforePanjang ?? '');

    await page.getByRole('button', { name: 'Atur Kalibrasi' }).click();
    await page.getByRole('slider', { name: 'Jangkar kalibrasi B' }).focus();
    await page.keyboard.press('Shift+ArrowRight');
    await expect(scale).not.toHaveText('1.916 mm / px');
    await expect(page.getByRole('group', { name: 'Handel koreksi pengukuran samping' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Terapkan Kalibrasi' }).click();
    const appliedScale = await scale.textContent();
    await expect(page.getByRole('slider', { name: 'Jangkar kalibrasi B' })).toHaveCount(0);
    await expect(grid).not.toHaveAttribute('data-grid-spacing-px', beforeGridSpacing ?? '');

    await page.getByRole('button', { name: 'kamera depan' }).click();
    await expect(scale).toHaveText('2.500 mm / px');
    await page.getByRole('button', { name: 'kamera samping' }).click();
    await expect(scale).toHaveText(appliedScale ?? '');
  });

  test('direct measurement manipulation persists corrected Side and Front geometry per moment', async ({ page }) => {
    await navigateToAnalysis(page);

    const scaleBefore = await page.getByTestId('inspector-scale').textContent();
    const autoPanjang = await page.getByTestId('side-overlay-spray-length').textContent();
    const autoLineEnd = await page.getByTestId('side-display-length-line').getAttribute('x2');
    await page.getByRole('button', { name: 'Koreksi Pengukuran' }).click();
    const endpoint = page.getByRole('slider', { name: 'Titik ujung semprot' });
    const endpointBox = await endpoint.boundingBox();
    if (!endpointBox) throw new Error('Endpoint unavailable');
    await page.mouse.move(endpointBox.x + endpointBox.width / 2, endpointBox.y + endpointBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(endpointBox.x + endpointBox.width / 2 + 35, endpointBox.y + endpointBox.height / 2, { steps: 4 });
    await expect(page.getByTestId('side-overlay-spray-length')).not.toHaveText(autoPanjang ?? '');
    await expect(page.getByTestId('inspector-side-spray-length')).not.toHaveText(autoPanjang ?? '');
    await page.mouse.up();
    await expect(page.getByTestId('inspector-scale')).toHaveText(scaleBefore ?? '');

    await endpoint.focus();
    const endpointBeforeKey = await endpoint.getAttribute('aria-valuetext');
    await page.keyboard.press('Shift+ArrowRight');
    await expect(endpoint).not.toHaveAttribute('aria-valuetext', endpointBeforeKey ?? '');
    await page.getByRole('button', { name: 'Terapkan Pengukuran' }).click();
    await expect(endpoint).toHaveCount(0);
    await expect(page.getByTestId('side-display-length-line')).not.toHaveAttribute('x2', autoLineEnd ?? '');
    await expect(page.getByTestId('inspector-side-spray-length')).toBeVisible();
    await expect(page.locator('.inspector-panel').first()).toContainText('Hasil Final');
    const appliedPanjang = await page.getByTestId('side-overlay-spray-length').textContent();

    await page.getByRole('button', { name: 'Tangkapan 27 1350 ms' }).click();
    await expect(page.locator('.inspector-panel').first()).not.toContainText('Hasil Final');
    await page.getByRole('button', { name: /Tangkapan 28 1400 ms/ }).click();
    await expect(page.getByTestId('side-overlay-spray-length')).toHaveText(appliedPanjang ?? '');

    await page.getByRole('button', { name: 'kamera depan' }).click();
    await page.getByRole('button', { name: 'Koreksi Pengukuran' }).click();
    const centroid = page.getByRole('slider', { name: 'Handel centroid semprot' });
    const centroidBox = await centroid.boundingBox();
    if (!centroidBox) throw new Error('Centroid unavailable');
    await page.mouse.move(centroidBox.x + centroidBox.width / 2, centroidBox.y + centroidBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(centroidBox.x + centroidBox.width / 2 + 25, centroidBox.y + centroidBox.height / 2 - 15, { steps: 3 });
    await page.mouse.up();
    const diameter = page.getByRole('slider', { name: 'Handel diameter ekuivalen kanan' });
    await diameter.focus();
    await page.keyboard.press('Shift+ArrowRight');
    await page.getByRole('button', { name: 'Terapkan Pengukuran' }).click();
    await expect(page.locator('.inspector-panel').first()).toContainText('Hasil Final');
  });

  test('final confirmation requires Primary and saves shared-moment summary', async ({ page }) => {
    await navigateToAnalysis(page);

    await expect(page.getByText('Pilih tepat satu Momen Tangkapan Utama sebelum konfirmasi.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Finalisasi Analisis' })).toBeDisabled();

    await page.getByRole('button', { name: 'Jadikan Utama' }).click();
    await expect(page.getByText('Tangkapan Utama', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('#028 · 1400 ms', { exact: true })).toBeVisible();
    await expect(page.getByText('Kamera Samping akhir')).toBeVisible();
    await expect(page.getByText('Kamera Depan akhir')).toBeVisible();
    await expect(page.getByText('Tangkapan Dipilih', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Finalisasi Analisis' }).click();
    await expect(page.getByText('Final', { exact: true })).toBeVisible();
  });

  test('capture selection: Primary, Supporting, remove, shared across tabs', async ({ page }) => {
    await navigateToAnalysis(page);

    await expect(page.getByText('Tangkapan Dipilih 0 / 10')).toBeVisible();
    await expect(page.getByText('Belum ada tangkapan laporan yang dipilih. Finalisasi memerlukan satu Utama.')).toBeVisible();

    await page.getByRole('button', { name: 'Jadikan Utama' }).click();
    await expect(page.getByText('★ Utama')).toBeVisible();
    await expect(page.getByText('Tangkapan Dipilih 1 / 10')).toBeVisible();

    await page.getByRole('button', { name: /Tangkapan 26 1300 ms/ }).click();
    await page.getByRole('button', { name: 'Tambah Pendukung' }).click();
    await expect(page.getByText('Tangkapan Dipilih 2 / 10')).toBeVisible();

    await page.getByRole('button', { name: 'kamera depan' }).click();
    await expect(page.getByText('Tangkapan Dipilih 2 / 10')).toBeVisible();
    await expect(page.getByText('★ Utama')).toBeVisible();

    await page.getByRole('button', { name: 'kamera samping' }).click();
    await page.getByRole('button', { name: /Hapus Tangkapan Pendukung 26/ }).click();
    await expect(page.getByText('Tangkapan Dipilih 1 / 10')).toBeVisible();
  });

  test('finalization navigates to Result V2 and Report V2', async ({ page }) => {
    await navigateToAnalysis(page);

    // Set primary and finalize
    await page.getByRole('button', { name: 'Jadikan Utama' }).click();
    await page.getByRole('button', { name: /Tangkapan 26 1300 ms/ }).click();
    await page.getByRole('button', { name: 'Tambah Pendukung' }).click();
    await page.getByRole('button', { name: /Tangkapan 28 1400 ms/ }).click();
    await page.getByRole('button', { name: 'Finalisasi Analisis' }).click();
    await expect(page.getByText('Final', { exact: true })).toBeVisible();

    // Navigate to Result page
    await page.getByRole('button', { name: 'Lihat Hasil' }).click();

    // Result header shows correct test info
    const result = page.locator('.result-v2');
    await expect(result.getByText('Final', { exact: true })).toBeVisible();
    await expect(result.getByText('Fine Mist 100 mL')).toBeVisible();
    await expect(result.getByText('#028 · 1400 ms').first()).toBeVisible();

    // Camera results present for both Side and Front
    await expect(result.getByText('Hasil Kamera Samping')).toBeVisible();
    await expect(result.getByText('Hasil Kamera Depan')).toBeVisible();

    // Calibration summaries
    await expect(result.getByText('Kalibrasi Samping').first()).toBeVisible();
    await expect(result.getByText('Kalibrasi Depan').first()).toBeVisible();

    // Audit section
    await expect(result.getByText('Audit Analisis')).toBeVisible();
    await expect(result.getByText('Nadia Putri').first()).toBeVisible();

    // Supporting capture present
    await expect(result.getByText('Tangkapan Pendukung')).toBeVisible();

    // Navigate to Reports via sidebar
    await page.getByRole('button', { name: 'Laporan' }).click();
    await expect(page.getByRole('heading', { name: 'Laporan', level: 1 })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Fine Mist 100 mL' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Buka Hasil' }).first()).toBeVisible();
  });

  test('measurement tool modes for Side Camera provide focused interactions and preserve edits', async ({ page }) => {
    await navigateToAnalysis(page);

    await page.getByRole('button', { name: 'Koreksi Pengukuran' }).click();
    
    // 1. Defaults to Panjang tool
    await expect(page.getByRole('tab', { name: 'Panjang' })).toHaveAttribute('aria-selected', 'true');
    // 2. Panjang tool shows only endpoint interaction
    await expect(page.getByRole('slider', { name: 'Titik ujung semprot' })).toBeVisible();
    await expect(page.getByRole('slider', { name: 'Posisi pengukuran sebaran' })).toHaveCount(0);
    await expect(page.getByRole('slider', { name: 'Batas sudut atas' })).toHaveCount(0);

    // Make an edit in Panjang
    const endpoint = page.getByRole('slider', { name: 'Titik ujung semprot' });
    await endpoint.focus();
    await page.keyboard.press('Shift+ArrowRight');
    
    // 3. Switch to Sebaran
    await page.getByRole('tab', { name: 'Sebaran' }).click();
    await expect(page.getByRole('tab', { name: 'Sebaran' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('slider', { name: 'Posisi pengukuran sebaran' })).toBeVisible();
    await expect(page.getByRole('slider', { name: 'Batas sebaran atas' })).toBeVisible();
    await expect(page.getByRole('slider', { name: 'Batas sebaran bawah' })).toBeVisible();
    await expect(page.getByRole('slider', { name: 'Titik ujung semprot' })).toHaveCount(0);
    
    // Make an edit in Sebaran
    const upperSebaran = page.getByRole('slider', { name: 'Batas sebaran atas' });
    await upperSebaran.focus();
    await page.keyboard.press('Shift+ArrowUp');
    const spreadPos = page.getByRole('slider', { name: 'Posisi pengukuran sebaran' });
    await spreadPos.focus();
    await page.keyboard.press('Shift+ArrowLeft');
    
    // 4. Switch to Sudut
    await page.getByRole('tab', { name: 'Sudut' }).click();
    await expect(page.getByRole('tab', { name: 'Sudut' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('slider', { name: 'Batas sudut atas' })).toBeVisible();
    await expect(page.getByRole('slider', { name: 'Batas sudut bawah' })).toBeVisible();
    await expect(page.getByRole('slider', { name: 'Posisi pengukuran sebaran' })).toHaveCount(0);

    // Make an edit in Sudut
    const upperSudut = page.getByRole('slider', { name: 'Batas sudut atas' });
    await upperSudut.focus();
    await page.keyboard.press('Shift+ArrowUp');

    // Apply all edits
    await page.getByRole('button', { name: 'Terapkan Pengukuran' }).click();
    
    // Check that edits are preserved
    await expect(page.getByTestId('inspector-side-spray-length')).toBeVisible();
    await expect(page.getByTestId('inspector-side-vertical-spread')).toBeVisible();
    await expect(page.getByTestId('inspector-side-spray-angle')).toBeVisible();
    await expect(page.locator('.inspector-panel').first()).toContainText('Hasil Final');
    
    // Verify Batal discards session
    await page.getByRole('button', { name: 'Koreksi Pengukuran' }).click();
    await expect(page.getByRole('tab', { name: 'Panjang' })).toHaveAttribute('aria-selected', 'true');
    await endpoint.focus();
    await page.keyboard.press('Shift+ArrowRight');
    await page.getByRole('button', { name: 'Batal' }).click();
  });

  test('Dashboard and History align with analysis lifecycle', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(page.getByRole('heading', { name: 'Dasbor' })).toBeVisible();

    // Verify Dashboard shows latest/current batch
    await expect(page.getByRole('heading', { name: 'Batch Terkini' })).toBeVisible();
    await expect(page.getByText('Temporal stability')).toHaveCount(0);
    await expect(page.getByText('BAT-24-0618').first()).toBeVisible();

    // Buka Batch from Dashboard
    await page.getByRole('button', { name: 'Lihat Detail Batch' }).click();
    await expect(page.getByRole('heading', { name: /Pengambilan Data/i })).toBeVisible();

    // Capture and proceed to Analysis
    await page.getByRole('button', { name: 'Mulai Pengambilan' }).click();
    await expect(page.getByText('Perlu Ditinjau').first()).toBeVisible({ timeout: 15000 });

    // Review Analysis
    await page.getByRole('button', { name: 'Tinjau Analisis' }).click();
    await expect(page.getByRole('heading', { name: 'Analisis', exact: true })).toBeVisible();

    // Finalize
    await page.getByRole('button', { name: 'Jadikan Utama' }).click();
    await page.getByRole('button', { name: 'Finalisasi Analisis' }).click();
    await expect(page.getByRole('heading', { name: 'BAT-24-0618' })).toBeVisible();

    // Go back to Dashboard
    await page.getByRole('button', { name: 'Dasbor' }).click();
    await expect(page.getByRole('heading', { name: 'Riwayat Finalisasi Terkini' })).toBeVisible();

    // Recent finalized batches row has batch ID
    const finalizedRow = page.locator('table').locator('tr', { hasText: 'BAT-24-0618' }).first();
    await expect(finalizedRow.getByText('BAT-24-0618')).toBeVisible();

    // Go to Batches
    await page.getByRole('button', { name: 'Batch', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Batch' }).first()).toBeVisible();
    
    // 1. Batches contains no Rear Camera fields.
    // 2. Batches contains no Rear Validity.
    await expect(page.getByText('Rear Validity')).toHaveCount(0);
    await expect(page.getByText('Bottle alignment')).toHaveCount(0);
    
    const batchRow = page.getByRole('row', { name: /BAT-24-0618/ });
    await expect(batchRow).toBeVisible();
    await batchRow.getByRole('button', { name: 'Buka Batch' }).click();
    await expect(page.getByRole('heading', { name: 'BAT-24-0618' })).toBeVisible();
  });
});

