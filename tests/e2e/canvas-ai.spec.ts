import { test, expect } from '@playwright/test';

test('canvas /ai: injects canvas context and includes system prompt', async ({ page }) => {
  // navigate directly to a drawing page (route handled by app)
  await page.goto('/drawings/test-ai', { waitUntil: 'networkidle' });

  // ensure toolbar brain button is available
  const brainBtn = page.locator('button[title="ask wilson about canvas"]');
  await expect(brainBtn).toBeVisible();

  // stub the prompt dialog that asks the user for the question
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('prompt');
    expect(dialog.message()).toMatch(/ask wilson about the canvas/i);
    await dialog.accept('please summarize the canvas');
  });

  // capture the outgoing llm request body
  let capturedPost: string | null = null;
  await page.route('**/api/generate', async (route, request) => {
    capturedPost = request.postData() || null;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ response: 'mocked canvas answer' }),
    });
  });

  // click the ai button which will trigger prompt + network call
  await brainBtn.click();

  // wait for the mocked ai response to appear in the chat panel
  await expect(page.locator('text=mocked canvas answer')).toBeVisible();

  // assertions on the intercepted payload
  expect(capturedPost).not.toBeNull();
  expect(capturedPost).toContain('you are wilson');
  // system prompt must ask for lowercase responses as per project rule
  expect(capturedPost).toMatch(/lowercase/);
  // canvas context should be injected into the prompt (we expect "canvas" or a small json snippet)
  expect(capturedPost).toMatch(/canvas|current page context/i);

  // verify the user-supplied question was forwarded (without leading '/ai')
  expect(capturedPost).toContain('please summarize the canvas');
});
