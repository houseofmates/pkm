import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FieldSettingsDialog } from '../field-settings-dialog';

// stub auth client
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ client: { updateField: vi.fn().mockResolvedValue({}) } })
}));

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
    const trigger = screen.getByRole('button');
    expect(trigger).toBeVisible();

    // choose a new type from the list:
    fireEvent.click(trigger);
    const item = await screen.findByText(/long text/i); // label for textarea
    fireEvent.click(item);

    // when closed value should be lowercase due to class
    expect(trigger).toHaveTextContent(/long text/);
    expect(trigger.textContent).toBe(trigger.textContent?.toLowerCase());
  });
});