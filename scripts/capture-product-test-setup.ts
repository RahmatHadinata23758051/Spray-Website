import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('artifacts/redesign/product-test-setup');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  const browser = await chromium.launch();
  const viewports = [
    { name: '1366x768', width: 1366, height: 768 },
    { name: '1440x900', width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto('http://localhost:4173');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForTimeout(400);

    // 1. Product list
    await page.getByRole('button', { name: 'Products' }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, `product-list-${vp.name}.png`), fullPage: false });

    // 2. Add Product form
    await page.getByRole('button', { name: '+ Add Product' }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, `add-product-${vp.name}.png`), fullPage: false });
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(200);

    // 3. Product Detail + Recipes
    await page.getByRole('button', { name: 'View Detail' }).first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, `product-detail-${vp.name}.png`), fullPage: false });

    // 4. New Test with Product selected
    await page.getByRole('button', { name: 'New Test' }).first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, `new-test-product-selected-${vp.name}.png`), fullPage: false });

    // 5. New Test with Recipe selected
    await page.getByLabel('Test Recipe').selectOption({ label: 'Stability Spray Test' });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(outDir, `new-test-recipe-selected-${vp.name}.png`), fullPage: false });

    // 6. Simulation settings expanded
    await page.getByRole('button', { name: /Simulation settings/i }).click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(outDir, `simulation-settings-expanded-${vp.name}.png`), fullPage: false });

    await page.close();
  }

  await browser.close();
  console.log('Product & Test Setup screenshots captured successfully under artifacts/redesign/product-test-setup/');
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
