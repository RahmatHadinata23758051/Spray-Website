export default async function run(page) {
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Capture' }).click();
  const captureText = await page.locator('main').innerText();
  await page.screenshot({ path: 'artifacts/redesign/analysis-v2/task-a-capture-smoke-1366x768.png', fullPage: false });
  await page.getByRole('button', { name: 'Analysis', exact: true }).click();
  const hasRearButton = await page.getByRole('button', { name: /rear camera/i }).count();
  await page.screenshot({ path: 'artifacts/redesign/analysis-v2/task-a-analysis-smoke-1366x768.png', fullPage: false });
  await page.getByRole('button', { name: 'History' }).click();
  const historyText = await page.locator('main').innerText();
  await page.getByRole('button', { name: 'Reports' }).click();
  const reportsText = await page.locator('main').innerText();
  return {
    captureHasRear: /Rear Camera|three-camera/i.test(captureText),
    analysisRearButtons: hasRearButton,
    historyHasRearValidity: /Rear Validity/i.test(historyText),
    reportsHasBottleAlignment: /Bottle Alignment|Rear validation/i.test(reportsText),
  };
}
