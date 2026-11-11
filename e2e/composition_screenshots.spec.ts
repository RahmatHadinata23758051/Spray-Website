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
