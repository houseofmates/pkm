const playwright = require('playwright');

(async () => {
  const url = process.env.PKM_URL || 'http://localhost:3010/template?mode=private';
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  // inject a token so app renders authenticated routes
  await context.addInitScript(() => {
    try { localStorage.setItem('nocobase_token', 'dev-smoke-token'); } catch(e) {}
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    const t = msg.type();
    const text = msg.text();
    if (t === 'error') consoleErrors.push(text);
    if (t === 'log' || t === 'info' || t === 'warning' || t === 'error') {
      console.log(`[PAGE ${t}] ${text}`);
    }
  });

  try {
    console.log('navigating to', url);
    // stub only actual server api calls (paths that begin with /api/) to avoid auth-required network calls
    await page.route('**/*', (route) => {
      const request = route.request();
      try {
        const u = new URL(request.url());
        if (u.pathname.startsWith('/api/')) {
          console.log('[ROUTE STUB]', request.url());
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
        }
      } catch (e) {
        // ignore and continue
      }
      return route.continue();
    });
    await page.goto(url, { waitUntil: 'networkidle' });
    // ensure token present: sometimes providers clear tokens early; set and reload
    await page.evaluate(() => { try { localStorage.setItem('nocobase_token', 'dev-smoke-token'); } catch(e) {} });
    await page.reload({ waitUntil: 'networkidle' });
    const tokenNow = await page.evaluate(() => localStorage.getItem('nocobase_token'));
    console.log('[LOCALSTORAGE] nocobase_token=', tokenNow);

    // click load sample then preview
    await page.waitForSelector('button:has-text("load sample")', { timeout: 5000 });
    await page.click('button:has-text("load sample")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("preview")');

    // wait for preview area to show
    await page.waitForSelector('text=Preview', { timeout: 5000 });

    // interact with any color input inside preview (chart controls)
    const color = await page.$('input[type="color"]');
    if (color) {
      console.log('found color input, clicking');
      await color.click();
      await page.waitForTimeout(200);
    }

    // find a form 'add sample' button inside preview and click it if present
    const addSample = await page.$('button:has-text("Add sample")');
    if (addSample) {
      console.log('clicking Add sample in preview form');
      await addSample.click();
      await page.waitForTimeout(200);
    }

    // click undo to ensure buttons are interactive
    const undo = await page.$('button:has-text("undo")');
    if (undo) {
      await undo.click();
      await page.waitForTimeout(200);
    }

    // capture a screenshot for review
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
