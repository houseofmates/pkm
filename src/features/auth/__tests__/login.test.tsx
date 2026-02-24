import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from '../../../pages/login';
import { AuthContext } from '@/contexts/auth-context';
import { NocoBaseClient } from '@/api/nocobase-client';
import { vi } from 'vitest';

// stub the client to avoid real network calls
const mockGet = vi.fn();

vi.mock('@/api/nocobase-client', () => {
  return {
    NocoBaseClient: vi.fn().mockImplementation(() => ({
      client: { get: mockGet },
    })),
  };
});

describe('LoginPage', () => {
  const loginMock = vi.fn();
  const authValue = {
    token: null,
    isAuthenticated: false,
    login: loginMock,
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

    expect(screen.getByPlaceholderText(/paste jwt token here/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('calls login when token validates successfully', async () => {
    mockGet.mockResolvedValue({});

    render(
      <AuthContext.Provider value={authValue as any}>
        <LoginPage />
      </AuthContext.Provider>
    );

    fireEvent.change(screen.getByPlaceholderText(/paste jwt token here/i), {
      target: { value: 'validtoken' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => expect(loginMock).toHaveBeenCalledWith('validtoken'));
    expect(screen.queryByText(/token appears invalid/i)).not.toBeInTheDocument();
  });

  it('shows error when validation fails', async () => {
    mockGet.mockRejectedValue({ response: { status: 401 } });

    render(
      <AuthContext.Provider value={authValue as any}>
        <LoginPage />
      </AuthContext.Provider>
    );

    fireEvent.change(screen.getByPlaceholderText(/paste jwt token here/i), {
      target: { value: 'badtoken' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() =>
      expect(screen.getByText(/token appears invalid or expired/i)).toBeInTheDocument()
    );
    expect(loginMock).not.toHaveBeenCalled();
  });
});
