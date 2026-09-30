import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('artifacts/redesign/revision-plus-jakarta-shell');
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
    
    // Login screenshot
    await page.screenshot({ path: path.join(outDir, `login-${vp.name}.png`), fullPage: true });

    // Sign in to Dashboard
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForTimeout(500);

    // Dashboard screenshot
    await page.screenshot({ path: path.join(outDir, `dashboard-${vp.name}.png`), fullPage: true });

    // Analysis screenshot
    await page.getByRole('button', { name: 'Analysis' }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, `analysis-${vp.name}.png`), fullPage: true });

    // History screenshot
    await page.getByRole('button', { name: 'History' }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, `history-${vp.name}.png`), fullPage: true });

    await page.close();
  }

  await browser.close();
  console.log('Screenshots captured successfully under artifacts/redesign/revision-plus-jakarta-shell/');
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
