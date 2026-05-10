const playwright = require('playwright');

(async () => {
  const url = process.env.PKM_URL || 'http://localhost:3010/template';
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const html = await page.content();
  console.log('--- PAGE HTML ---');
  console.log(html.slice(0, 20000));
  await browser.close();
})();
