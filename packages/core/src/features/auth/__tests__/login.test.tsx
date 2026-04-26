import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from '../../../pages/login';
import { AuthContext } from '@/contexts/auth-context';
import { NocoBaseClient } from '@/api/nocobase-client';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// stub the client to avoid real network calls
const mockGet = vi.fn();

vi.mock('@/api/nocobase-client', () => {
  // return a fake constructor so `new nocobaseclient()` works correctly
  function FakeClient(this: any) {
    this.client = { get: mockGet };
  }
  return {
    NocoBaseClient: FakeClient,
  };
});

describe('LoginPage', () => {
  const loginWithApiKeyMock = vi.fn();
  const authValue = {
    token: null,
    isAuthenticated: false,
    loginWithApiKey: loginWithApiKeyMock,
    logout: vi.fn(),
    client: {} as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders textarea and button', () => {
    render(
      <AuthContext.Provider value={authValue as any}>
        <LoginPage />
      </AuthContext.Provider>
    );

    expect(screen.getByPlaceholderText(/api key/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('calls login when token validates successfully', async () => {
    mockGet.mockResolvedValue({});

    render(
      <AuthContext.Provider value={authValue as any}>
        <LoginPage />
      </AuthContext.Provider>
    );

    fireEvent.change(screen.getByPlaceholderText(/api key/i), {
      target: { value: 'validtoken' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => expect(loginWithApiKeyMock).toHaveBeenCalledWith('validtoken'));
    expect(screen.queryByText(/token appears invalid/i)).not.toBeInTheDocument();
  });

  it('shows error when validation fails', async () => {
    loginWithApiKeyMock.mockRejectedValue(new Error("token appears invalid or expired"));

    render(
      <AuthContext.Provider value={authValue as any}>
        <LoginPage />
      </AuthContext.Provider>
    );

    fireEvent.change(screen.getByPlaceholderText(/api key/i), {
      target: { value: 'badtoken' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() =>
      expect(screen.getByText(/token appears invalid or expired/i)).toBeInTheDocument()
    );

  });
});
