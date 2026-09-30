import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('artifacts/redesign/phase-03-analysis-refined');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  const browser = await chromium.launch();

  // Helper to get to Analysis page
  const setupPage = async (width: number, height: number) => {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto('http://localhost:4173');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Analysis' }).click();
    await page.waitForTimeout(300);
    return page;
  };

  // 1366x768 screenshots
  {
    const page = await setupPage(1366, 768);

    // 1. Side Original
    await page.getByRole('button', { name: 'Original' }).click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(outDir, 'side-original-1366x768.png'), fullPage: false });

    // 2. Side Mask
    await page.getByRole('button', { name: 'Mask' }).click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(outDir, 'side-mask-1366x768.png'), fullPage: false });

    // 3. Side Overlay
    await page.getByRole('button', { name: 'Overlay' }).click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(outDir, 'side-overlay-1366x768.png'), fullPage: false });

    // 4. Front Overlay
    await page.getByRole('button', { name: 'Front camera' }).click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(outDir, 'front-overlay-1366x768.png'), fullPage: false });


    await page.close();
  }

  // 6. Side Overlay 1440x900
  {
    const page = await setupPage(1440, 900);
    await page.getByRole('button', { name: 'Overlay' }).click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(outDir, 'side-overlay-1440x900.png'), fullPage: false });
    await page.close();
  }

  // 7. Side Overlay 1920x1080
  {
    const page = await setupPage(1920, 1080);
    await page.getByRole('button', { name: 'Overlay' }).click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(outDir, 'side-overlay-1920x1080.png'), fullPage: false });
    await page.close();
  }

  await browser.close();
  console.log('Phase 3 refined screenshots captured successfully under artifacts/redesign/phase-03-analysis-refined/');
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
