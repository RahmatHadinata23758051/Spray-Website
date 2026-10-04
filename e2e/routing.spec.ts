import { test, expect } from '@playwright/test';

test.describe('Router infrastructure and URL-based navigation', () => {
  test('direct navigation to static routes works and renders matching pages', async ({ page }) => {
    // Dashboard
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dasbor' })).toBeVisible();
    expect(page.url()).toContain('/dashboard');

    // Products
    await page.goto('/products');
    await expect(page.getByRole('heading', { name: 'Produk' })).toBeVisible();
    expect(page.url()).toContain('/products');

    // Reports
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Laporan', level: 1 })).toBeVisible();
    expect(page.url()).toContain('/reports');

    // Calibration
    await page.goto('/calibration');
    await expect(page.getByRole('heading', { name: 'Kalibrasi', level: 1 })).toBeVisible();
    expect(page.url()).toContain('/calibration');

    // Users
    await page.goto('/users');
    await expect(page.getByRole('heading', { name: 'Pengguna', level: 1 })).toBeVisible();
    expect(page.url()).toContain('/users');

    // Settings
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Pengaturan', level: 1 })).toBeVisible();
    expect(page.url()).toContain('/settings');
  });

  test('root route ("/") redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByText('Masuk ke Spraybot')).toBeVisible();
  });

  test('unknown route renders 404 page with return to dashboard link', async ({ page }) => {
    await page.goto('/some-unknown-path');
    await expect(page.getByText('404 - Page Not Found')).toBeVisible();
    await expect(page.getByText('The requested URL route does not exist.')).toBeVisible();
    await page.getByRole('button', { name: 'Return to Dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Dasbor' })).toBeVisible();
    expect(page.url()).toContain('/dashboard');
  });

  test('sidebar clicks update browser URL and active states correctly', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dasbor' })).toBeVisible();

    // Click Products
    await page.getByRole('button', { name: 'Produk', exact: true }).click();
    expect(page.url()).toContain('/products');
    await expect(page.getByRole('heading', { name: 'Produk' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Produk', exact: true })).toHaveClass(/nav-item-selected/);

    // Click Reports
    await page.getByRole('button', { name: 'Laporan' }).click();
    expect(page.url()).toContain('/reports');
    await expect(page.getByRole('heading', { name: 'Laporan', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Laporan' })).toHaveClass(/nav-item-selected/);

    // Click Settings in session area
    await page.getByRole('button', { name: 'Pengaturan' }).click();
    expect(page.url()).toContain('/settings');
    await expect(page.getByRole('heading', { name: 'Pengaturan', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pengaturan' })).toHaveClass(/nav-item-selected/);
  });

  test('browser Back and Forward preserve history and page alignment', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dasbor' })).toBeVisible();

    await page.getByRole('button', { name: 'Produk', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Produk' })).toBeVisible();
    expect(page.url()).toContain('/products');

    await page.getByRole('button', { name: 'Kalibrasi' }).click();
    await expect(page.getByRole('heading', { name: 'Kalibrasi', level: 1 })).toBeVisible();
    expect(page.url()).toContain('/calibration');

    // Go back to Products
    await page.goBack();
    expect(page.url()).toContain('/products');
    await expect(page.getByRole('heading', { name: 'Produk' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Produk', exact: true })).toHaveClass(/nav-item-selected/);

    // Go back to Dashboard
    await page.goBack();
    expect(page.url()).toContain('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dasbor' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dasbor' })).toHaveClass(/nav-item-selected/);

    // Go forward to Products
    await page.goForward();
    expect(page.url()).toContain('/products');
    await expect(page.getByRole('heading', { name: 'Produk' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Produk', exact: true })).toHaveClass(/nav-item-selected/);

    // Go forward to Calibration
    await page.goForward();
    expect(page.url()).toContain('/calibration');
    await expect(page.getByRole('heading', { name: 'Kalibrasi', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Kalibrasi' })).toHaveClass(/nav-item-selected/);
  });

  test('refresh of static route preserves rendered page and URL', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByRole('heading', { name: 'Produk' })).toBeVisible();

    await page.reload();
    expect(page.url()).toContain('/products');
    await expect(page.getByRole('heading', { name: 'Produk' })).toBeVisible();
  });
});
