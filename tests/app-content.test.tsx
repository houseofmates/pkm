import { render, screen, waitFor } from '@testing-library/react';
import App from '@/App';
import { vi } from 'vitest';

// stub lazy components that are not needed
vi.mock('@/components/setup-required', () => ({ SetupRequired: () => <div>setup-required</div> }));
vi.mock('@/pages/login', () => ({ LoginPage: () => <div>login page</div> }));
vi.mock('@/pages/home', () => ({ HomePage: () => <div>home</div> }));

// ensure auth context returns no token by default
vi.mock('@/contexts/auth-context', () => ({
  AuthProvider: ({ children }: any) => <>{children}</>,
  useAuth: vi.fn(() => ({ token: null, isLoading: false })),
}));

// stub isPublicDomain so tests are deterministic
vi.mock('@/utils/subdomain-router', () => ({ isPublicDomain: () => false }));

// baseline fetch stub
beforeEach(() => {
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) }));
});

describe('AppContent startup', () => {
  it('shows login page when backend healthy and no token', async () => {
    render(<App />);
    // wait for health check effect to complete
    await waitFor(() => expect(screen.getByText(/login page/i)).toBeInTheDocument());
  });

  it('renders setup required when health check fails', async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: false });
    render(<App />);
    await waitFor(() => expect(screen.getByText(/setup-required/i)).toBeInTheDocument());
  });
});