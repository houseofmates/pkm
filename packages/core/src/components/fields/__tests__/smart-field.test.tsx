// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SmartField } from '../smart-field';
import { AuthContext } from '@/contexts/auth-context';
import { describe, it, expect, vi } from 'vitest';

// minimal auth stub
const fakeClient = { listRecords: vi.fn(), upload: vi.fn() };
const authValue = { token: 'x', isAuthenticated: true, login: vi.fn(), logout: vi.fn(), client: fakeClient };
function withAuth(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authValue as any}>{ui}</AuthContext.Provider>
    </MemoryRouter>
  );
}

describe('SmartField stub', () => {
  it('renders the stubbed value under test', () => {
    withAuth(<SmartField value="hello" field={{ interface: 'input', name: 'foo' }} onChange={() => {}} />);
    expect(screen.getByTestId('smartfield-vitest')).toHaveTextContent('hello');
  });

  it('renders numeric value as text', () => {
    withAuth(<SmartField value={42} field={{ interface: 'number', name: 'num' }} onChange={() => {}} />);
    expect(screen.getByTestId('smartfield-vitest')).toHaveTextContent('42');
  });

  it('renders without auth wrapper', () => {
    const { container } = render(<SmartField value="z" field={{ interface: 'input', name: 'foo' }} onChange={() => {}} />);
    expect(container.querySelector('[data-testid="smartfield-vitest"]')).toBeTruthy();
  });
});

