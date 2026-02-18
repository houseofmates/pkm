const playwright = require('playwright');

(async () => {
  const url = process.env.PKM_URL || 'http://localhost:3010/template';
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    console.log('navigating to', url);
    await page.goto(url, { waitUntil: 'networkidle' });

    // click load sample then preview
    await page.waitForSelector('button:has-text("load sample")', { timeout: 5000 });
    await page.click('button:has-text("load sample")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("preview")');

    // wait for preview area to show
    await page.waitForSelector('text=Preview', { timeout: 5000 });

    // Interact with any color input inside preview (chart controls)
    const color = await page.$('input[type="color"]');
    if (color) {
      console.log('found color input, clicking');
      await color.click();
      await page.waitForTimeout(200);
    }

    // Find a form 'Add sample' button inside preview and click it if present
    const addSample = await page.$('button:has-text("Add sample")');
    if (addSample) {
      console.log('clicking Add sample in preview form');
      await addSample.click();
      await page.waitForTimeout(200);
    }

    // Click undo to ensure buttons are interactive
    const undo = await page.$('button:has-text("undo")');
    if (undo) {
      await undo.click();
      await page.waitForTimeout(200);
    }

    // Capture a screenshot for review
    await page.screenshot({ path: 'smoke-template.png', fullPage: false });

    if (consoleErrors.length) {
      console.log('Console errors were captured:');
      consoleErrors.forEach(e => console.log(e));
      process.exitCode = 2;
    } else {
      console.log('Smoke test passed, no console errors.');
    }
  } catch (err) {
    console.error('Smoke test failed:', err);
    process.exitCode = 3;
  } finally {
    await browser.close();
  }
})();
