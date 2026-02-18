const { chromium } = require('playwright');

(async () => {
  const base = process.env.PKM_BASE_URL || 'http://localhost:3010';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let captured = null;

  // intercept llm generate calls and return a deterministic response
  await page.route('**/api/generate', async (route, request) => {
    captured = request.postData();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ response: 'mocked canvas answer' }),
    });
  });

  // stub only the nocobase endpoints used during app init to avoid 401 clearing the token
  await page.route('**/api/headmates:list*', (route) => {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });
  await page.route('**/api/front_history:list*', (route) => {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });
  await page.route('**/api/collections:list*', (route) => {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  // also stub direct backend origins used in some environments
  await page.route('http://localhost:4100/**', (route) => {
    if (route.request().url().includes('/api/generate')) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });
  await page.route('http://192.168.254.33:8091/**', (route) => {
    if (route.request().url().includes('/api/generate')) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  // intercept external nocobase host used by dev proxy to avoid remote 401 responses
  await page.route('https://db.houseofmates.space/api/**', (route) => {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  // auto-accept prompt with the user's question
  page.once('dialog', async (dialog) => {
    console.log('[e2e] dialog shown:', dialog.message());
    await dialog.accept('please summarize the canvas');
  });

  console.log('[e2e] navigating to drawing page...');

  // log client console + page errors to help debug why toolbar may not mount
  page.on('console', msg => console.log(`[browser console:${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.log('[browser pageerror]', err));

  // log network requests/responses for /api/* to find failing endpoints
  page.on('request', (req) => {
    if (req.url().includes('/api/')) console.log('[network request]', req.method(), req.url());
  });
  page.on('response', async (res) => {
    try {
      if (res.url().includes('/api/')) console.log('[network response]', res.status(), res.url());
    } catch (e) {
      // ignore
    }
  });

  // ensure app treats the session as an authenticated private app
  await page.addInitScript(() => {
    try {
      localStorage.setItem('nocobase_token', 'test-token');
      // lightweight drawing config so the page shows a title if read
      localStorage.setItem('drawing-config-test-ai', JSON.stringify({ title: 'test drawing' }));
    } catch (e) {
      // ignore
    }
  });

  // navigate in private mode so /drawings route is available
  await page.goto(`${base}/drawings/test-ai?mode=private`, { waitUntil: 'networkidle' });

  // dump a small snapshot of the DOM body for debugging if toolbar doesn't appear
  const bodyHtml = await page.locator('body').innerHTML();
  console.log('[e2e] body snapshot length:', bodyHtml.length);

  const brainBtn = await page.waitForSelector('button[title="ask wilson about canvas"]', { timeout: 10000 });
  console.log('[e2e] clicking brain button');
  await brainBtn.click();

  // wait for reply to appear in the chat panel
  await page.waitForSelector('text=mocked canvas answer', { timeout: 8000 });

  // validations against intercepted payload
  if (!captured) {
    console.error('[e2e] no /api/generate request was intercepted');
    await browser.close();
    process.exit(2);
  }

  console.log('[e2e] intercepted generate payload length:', captured.length);

  if (!captured.includes('you are wilson')) {
    console.error('[e2e] system prompt missing: "you are wilson"');
    process.exit(3);
  }
  if (!/lowercase/i.test(captured)) {
    console.error('[e2e] system prompt missing lowercase rule');
    process.exit(4);
  }
  if (!/canvas|current page context/i.test(captured)) {
    console.error('[e2e] canvas context not injected into prompt');
    process.exit(5);
  }
  if (!captured.includes('please summarize the canvas')) {
    console.error('[e2e] user question was not forwarded');
    process.exit(6);
  }

  console.log('[e2e] canvas /ai test passed');
  await browser.close();
  process.exit(0);
})().catch(async (err) => {
  console.error('[e2e] fatal:', err);
  process.exit(1);
});
