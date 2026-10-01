import { test, expect } from '@playwright/test';

test.describe('Router infrastructure and URL-based navigation', () => {
  test('direct navigation to static routes works and renders matching pages', async ({ page }) => {
    // Dashboard
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    expect(page.url()).toContain('/dashboard');

    // Products
    await page.goto('/products');
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
    expect(page.url()).toContain('/products');

    // Reports
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible();
    expect(page.url()).toContain('/reports');

    // Calibration
    await page.goto('/calibration');
    await expect(page.getByRole('heading', { name: 'Calibration', level: 1 })).toBeVisible();
    expect(page.url()).toContain('/calibration');

    // Users
    await page.goto('/users');
    await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible();
    expect(page.url()).toContain('/users');

    // Settings
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
    expect(page.url()).toContain('/settings');
  });

  test('root route ("/") redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByText('Sign in to Spraybot')).toBeVisible();
  });

  test('unknown route renders 404 page with return to dashboard link', async ({ page }) => {
    await page.goto('/some-unknown-path');
    await expect(page.getByText('404 - Page Not Found')).toBeVisible();
    await expect(page.getByText('The requested URL route does not exist.')).toBeVisible();
    await page.getByRole('button', { name: 'Return to Dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    expect(page.url()).toContain('/dashboard');
  });

  test('sidebar clicks update browser URL and active states correctly', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Click Products
    await page.getByRole('button', { name: 'Products' }).click();
    expect(page.url()).toContain('/products');
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Products' })).toHaveClass(/nav-item-selected/);

    // Click Reports
    await page.getByRole('button', { name: 'Reports' }).click();
    expect(page.url()).toContain('/reports');
    await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reports' })).toHaveClass(/nav-item-selected/);

    // Click Settings in session area
    await page.getByRole('button', { name: 'Settings' }).click();
    expect(page.url()).toContain('/settings');
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings' })).toHaveClass(/nav-item-selected/);
  });

  test('browser Back and Forward preserve history and page alignment', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await page.getByRole('button', { name: 'Products' }).click();
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
    expect(page.url()).toContain('/products');

    await page.getByRole('button', { name: 'Calibration' }).click();
    await expect(page.getByRole('heading', { name: 'Calibration', level: 1 })).toBeVisible();
    expect(page.url()).toContain('/calibration');

    // Go back to Products
    await page.goBack();
    expect(page.url()).toContain('/products');
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Products' })).toHaveClass(/nav-item-selected/);

    // Go back to Dashboard
    await page.goBack();
    expect(page.url()).toContain('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dashboard' })).toHaveClass(/nav-item-selected/);

    // Go forward to Products
    await page.goForward();
    expect(page.url()).toContain('/products');
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Products' })).toHaveClass(/nav-item-selected/);

    // Go forward to Calibration
    await page.goForward();
    expect(page.url()).toContain('/calibration');
    await expect(page.getByRole('heading', { name: 'Calibration', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Calibration' })).toHaveClass(/nav-item-selected/);
  });

  test('refresh of static route preserves rendered page and URL', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();

    await page.reload();
    expect(page.url()).toContain('/products');
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
  });
});
