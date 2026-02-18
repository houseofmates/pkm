const playwright = require('playwright');

(async () => {
  const url = process.env.PKM_URL || 'http://localhost:3010/template?mode=private';
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addInitScript(() => {
    try { localStorage.setItem('nocobase_token', 'dev-smoke-token'); } catch(e) {}
  });
  const page = await context.newPage();

  page.on('console', msg => {
    const t = msg.type();
    const text = msg.text();
    if (t === 'error') console.error('[PAGE ERROR]', text);
    else console.log(`[PAGE ${t}] ${text}`);
  });

  try {
    await page.route('**/*', (route) => {
      const request = route.request();
      try {
        const u = new URL(request.url());
        if (u.pathname.startsWith('/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
      } catch (e) {}
      return route.continue();
    });

    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => { try { localStorage.setItem('nocobase_token', 'dev-smoke-token'); } catch(e) {} });
    await page.reload({ waitUntil: 'networkidle' });

    // use the page's default template JSON (already multi-column) and open preview
    await page.waitForSelector('button:has-text("preview")', { timeout: 5000 });
    await page.click('button:has-text("preview")');
    await page.waitForTimeout(200);
    await page.waitForSelector('#preview-canvas-root', { timeout: 5000 });

    // Instrument preview cards to count click events
    await page.evaluate(() => {
      window.__preview_clicks = 0;
      const handler = (e) => { window.__preview_clicks += 1; };
      // attach to existing preview items and also capture future ones
      document.querySelectorAll('[data-preview-id]').forEach(el => el.addEventListener('click', handler, true));
      const mo = new MutationObserver(mr => {
        mr.forEach(r => r.addedNodes.forEach(n => { if (n.nodeType === 1 && n.querySelectorAll) { n.querySelectorAll('[data-preview-id]').forEach(el => el.addEventListener('click', handler, true)); } }));
      });
      mo.observe(document.body, { childList: true, subtree: true });
      window.__preview_click_handler = handler;
      window.__preview_click_mo = mo;
    });

    // find a preview card to drag
    const card = await page.$('[data-preview-id]');
    if (!card) throw new Error('no preview card found to test');
    const box = await card.boundingBox();
    if (!box) throw new Error('could not get card bounding box');

    // simulate press+move — begin drag and inspect overlay position
    const start = { x: box.x + box.width/2, y: box.y + box.height/2 };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();

    // larger move to ensure dnd-kit activates and shows the DragOverlay
    const mid = { x: start.x + 160, y: start.y + 8 };
    await page.mouse.move(mid.x, mid.y, { steps: 12 });

    // wait for overlay to appear and measure its bounding box vs pointer
    await page.waitForTimeout(120);
    const overlayBox = await page.evaluate(() => {
      const overlay = document.querySelector('[data-dnd-kit-drag-overlay]');
      if (!overlay) return null;
      const child = overlay.querySelector('[data-preview-id], .cursor-grabbing, .shadow-2xl');
      const el = child || overlay;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, overlayExists: !!overlay };
    });
    console.log('[TEST] overlayBox', overlayBox, 'pointer', mid);

    // finish the drag (release)
    await page.mouse.up();

    // wait a moment and check click counter
    await page.waitForTimeout(200);
    const clicks = await page.evaluate(() => window.__preview_clicks || 0);
    console.log('[TEST] preview click events counted after drag:', clicks);

    if (clicks !== 0) {
      console.error('FAIL: click fired on drag-release (expected 0)');
      process.exitCode = 2;
    } else {
      console.log('PASS: no click fired on drag-release');
    }

    // --- NEW: verify cross-column drop moves the card between columns ---
    const colCountsBefore = await page.evaluate(() => Array.from(document.querySelectorAll('#preview-canvas-root > .space-y-4')).map(c => c.querySelectorAll('[data-preview-id]').length));
    console.log('[TEST] column counts before manual cross-column drag:', colCountsBefore);

    // pick a card from any non-empty column and drag it into a different column
    const srcIndex = colCountsBefore.findIndex(n => n > 0);
    if (srcIndex === -1 || colCountsBefore.length < 2) {
      console.log('[TEST] not enough columns/cards to validate cross-column drag — skipping');
    } else {
      const targetIndex = (srcIndex + 1) % colCountsBefore.length;
      const selector = `#preview-canvas-root > .space-y-4:nth-child(${srcIndex+1}) [data-preview-id]`;
      const firstCard = await page.$(selector);
      if (!firstCard) throw new Error('expected a card in source column');

      const firstBox = await firstCard.boundingBox();
      const canvasRect = await page.$eval('#preview-canvas-root', el => el.getBoundingClientRect());
      const targetX = canvasRect.x + canvasRect.width * ((targetIndex + 0.5) / colCountsBefore.length);
      const targetY = firstBox.y + firstBox.height/2;

      await page.mouse.move(firstBox.x + firstBox.width/2, firstBox.y + firstBox.height/2);
      await page.mouse.down();
      await page.mouse.move(targetX, targetY, { steps: 18 });
      await page.waitForTimeout(200);
      await page.mouse.up();
    }

    await page.waitForTimeout(250);
    const colCountsAfter = await page.evaluate(() => Array.from(document.querySelectorAll('#preview-canvas-root > .space-y-4')).map(c => c.querySelectorAll('[data-preview-id]').length));
    console.log('[TEST] column counts after manual cross-column drag:', colCountsAfter);

    if (colCountsAfter.some((n, i) => n !== colCountsBefore[i])) {
      console.log('PASS: item moved between columns');
    } else {
      console.error('FAIL: item did not move between columns');
      process.exitCode = 2;
    }

    // cleanup
    await page.evaluate(() => { try { window.__preview_click_mo?.disconnect(); } catch(e) {} });
  } catch (err) {
    console.error('drag-release test failed:', err);
    process.exitCode = 3;
  } finally {
    await browser.close();
  }
})();
