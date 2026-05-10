{/* eslint-disable */}
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from '../../../pages/login';
import { AuthContext } from '@/contexts/auth-context';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('LoginPage', () => {
  const loginWithApiKeyMock = vi.fn();
  const authValue = {
    token: null,
    isAuthenticated: false,
    login: vi.fn(),
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

  it('calls api key login when submission succeeds', async () => {
    loginWithApiKeyMock.mockResolvedValue(undefined);

    render(
      <AuthContext.Provider value={authValue as any}>
        <LoginPage />
      </AuthContext.Provider>
    );

    fireEvent.change(screen.getByPlaceholderText(/api key/i), {
      target: { value: 'valid-api-key' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => expect(loginWithApiKeyMock).toHaveBeenCalledWith('valid-api-key'));
    expect(screen.queryByText(/login failed/i)).not.toBeInTheDocument();
  });

  it('shows error when api key login fails', async () => {
    loginWithApiKeyMock.mockRejectedValue(new Error('invalid api key'));

    render(
      <AuthContext.Provider value={authValue as any}>
        <LoginPage />
      </AuthContext.Provider>
    );

    fireEvent.change(screen.getByPlaceholderText(/api key/i), {
      target: { value: 'bad-api-key' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() =>
      expect(screen.getByText(/invalid api key/i)).toBeInTheDocument()
    );
    expect(loginWithApiKeyMock).toHaveBeenCalledWith('bad-api-key');
  });
});
