import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, vi, expect } from 'vitest';
import { FieldSettingsDialog } from '../field-settings-dialog';

// stub auth client
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ client: { updateField: vi.fn().mockResolvedValue({}) } })
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/select', () => {
  const SelectContext = React.createContext({ value: '', onValueChange: undefined as undefined | ((val: string) => void) });

  const Select = ({ value, onValueChange, children }: any) => (
    <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>
  );

  const SelectTrigger = ({ children, ...props }: any) => (
    <button role="combobox" aria-expanded="true" {...props}>{children}</button>
  );

  const SelectValue = () => {
    const ctx = React.useContext(SelectContext);
    return <span>{ctx.value}</span>;
  };

  const SelectContent = ({ children }: any) => <div role="listbox">{children}</div>;

  const SelectItem = ({ value, children }: any) => {
    const ctx = React.useContext(SelectContext);
    return (
      <div role="option" aria-selected={ctx.value === value} onClick={() => ctx.onValueChange?.(value)}>
        {children}
      </div>
    );
  };

  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

beforeAll(() => {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

// ensure dialog works within normal app environment (no routers required)

describe('FieldSettingsDialog', () => {
  const field = { name: 'avatar_url', interface: 'textarea', uiSchema: {} };
  const collectionName = 'headmates';

  it('renders and lowercases selected type in trigger', () => {
    render(
      <FieldSettingsDialog
        collectionName={collectionName}
        field={field}
        open={true}
        onOpenChange={() => {}}
        onFieldUpdated={() => {}}
      />
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeVisible();
    expect(trigger).toHaveTextContent(/textarea/);
    expect(trigger.textContent).toBe(trigger.textContent?.toLowerCase());
  });
});