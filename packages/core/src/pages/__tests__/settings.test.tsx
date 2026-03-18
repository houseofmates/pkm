import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsPage from '../settings';
import { storageManager } from '@/lib/storage-manager';
import { AuthContext } from '@/contexts/auth-context';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// stub import widget so we don't need network
vi.mock('@/components/notion-import-widget', () => ({
  NotionImportWidget: () => <div data-testid="import-widget">import widget</div>
}));

const authValue = { token: '', isAuthenticated: true, login: () => {}, logout: () => {}, client: {} };

describe('Settings page', () => {
  beforeEach(() => {
    storageManager.clear();
  });

  it('renders general settings and import widget (with hint when api key missing)', () => {
    const { container } = render(
      <AuthContext.Provider value={authValue as any}>
        <SettingsPage />
      </AuthContext.Provider>
    );

    expect(screen.getByText(/settings/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dark mode/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/default page size/i)).toBeInTheDocument();
    expect(screen.getByTestId('import-widget')).toBeInTheDocument();
    // hint should show when api key string is empty
    expect(screen.getByText(/set your api key above to enable notion import/i)).toBeInTheDocument();

    // root wrapper should allow scrolling and fill available height
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/overflow-auto/);
    expect(root.className).toMatch(/h-full/);
  });

  it('allows toggling dark mode and stores in localStorage', () => {
    render(
      <AuthContext.Provider value={authValue as any}>
        <SettingsPage />
      </AuthContext.Provider>
    );
    const checkbox = screen.getByLabelText(/dark mode/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
    // drop into localStorage
    expect(storageManager.getItem('pkm_setting:darkMode')).toBe('true');
  });
});