import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FieldSettingsDialog } from '../field-settings-dialog';

// stub auth client
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ client: { updateField: vi.fn().mockResolvedValue({}) } })
}));

beforeEach(() => {
  // Radix Select calls scrollIntoView on option refs; jsdom stubs it with no-op
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
});

// ensure dialog works within normal app environment (no routers required)

describe('FieldSettingsDialog', () => {
  const field = { name: 'avatar_url', interface: 'attachment', uiSchema: {} };
  const collectionName = 'headmates';

  it('renders and lowercases selected type in trigger', async () => {
    render(
      <FieldSettingsDialog
        collectionName={collectionName}
        field={field}
        open={true}
        onOpenChange={() => {}}
        onFieldUpdated={() => {}}
      />
    );

    // open select
    const trigger = screen.getByLabelText(/property type/i);
    expect(trigger).toBeVisible();

    // choose a new type from the list:
    fireEvent.click(trigger);
    const item = await screen.findByRole('option', { name: /long text/i });
    fireEvent.click(item);

    // when closed value should be lowercase due to class
    expect(trigger).toHaveTextContent(/long text/);
    expect(trigger.textContent).toBe(trigger.textContent?.toLowerCase());
  });
});