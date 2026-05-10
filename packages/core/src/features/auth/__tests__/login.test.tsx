{/* eslint-disable */}
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from '../../../pages/login';
import { AuthContext } from '@/contexts/auth-context';
<<<<<<< HEAD
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
  const loginMock = vi.fn();
  const authValue = {
    token: null,
    isAuthenticated: false,
    login: loginMock,
=======
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('LoginPage', () => {
  const loginWithApiKeyMock = vi.fn();
  const authValue = {
    token: null,
    isAuthenticated: false,
    login: vi.fn(),
    loginWithApiKey: loginWithApiKeyMock,
>>>>>>> main
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

<<<<<<< HEAD
    expect(screen.getByPlaceholderText(/paste jwt token here/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('calls login when token validates successfully', async () => {
    mockGet.mockResolvedValue({});
=======
    expect(screen.getByPlaceholderText(/api key/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('calls api key login when submission succeeds', async () => {
    loginWithApiKeyMock.mockResolvedValue(undefined);
>>>>>>> main

    render(
      <AuthContext.Provider value={authValue as any}>
        <LoginPage />
      </AuthContext.Provider>
    );

<<<<<<< HEAD
    fireEvent.change(screen.getByPlaceholderText(/paste jwt token here/i), {
      target: { value: 'validtoken' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => expect(loginMock).toHaveBeenCalledWith('validtoken'));
    expect(screen.queryByText(/token appears invalid/i)).not.toBeInTheDocument();
  });

  it('shows error when validation fails', async () => {
    mockGet.mockRejectedValue({ response: { status: 401 } });
=======
    fireEvent.change(screen.getByPlaceholderText(/api key/i), {
      target: { value: 'valid-api-key' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => expect(loginWithApiKeyMock).toHaveBeenCalledWith('valid-api-key'));
    expect(screen.queryByText(/login failed/i)).not.toBeInTheDocument();
  });

  it('shows error when api key login fails', async () => {
    loginWithApiKeyMock.mockRejectedValue(new Error('invalid api key'));
>>>>>>> main

    render(
      <AuthContext.Provider value={authValue as any}>
        <LoginPage />
      </AuthContext.Provider>
    );

<<<<<<< HEAD
    fireEvent.change(screen.getByPlaceholderText(/paste jwt token here/i), {
      target: { value: 'badtoken' },
=======
    fireEvent.change(screen.getByPlaceholderText(/api key/i), {
      target: { value: 'bad-api-key' },
>>>>>>> main
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() =>
<<<<<<< HEAD
      expect(screen.getByText(/token appears invalid or expired/i)).toBeInTheDocument()
    );
    expect(loginMock).not.toHaveBeenCalled();
=======
      expect(screen.getByText(/invalid api key/i)).toBeInTheDocument()
    );
    expect(loginWithApiKeyMock).toHaveBeenCalledWith('bad-api-key');
>>>>>>> main
  });
});
