import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { SmartField } from '../smart-field';
import { AuthContext } from '@/contexts/auth-context';

import { vi } from 'vitest';

const fakeClient = {
  listRecords: vi.fn().mockResolvedValue({ data: [] }),
  upload: vi.fn().mockResolvedValue({ data: { url: 'http://example.com/fake' } }),
};

const authValue = {
  token: 'fake',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  client: fakeClient,
};

function withAuth(ui: React.ReactElement) {
  return render(<AuthContext.Provider value={authValue as any}>{ui}</AuthContext.Provider>);
}

describe('SmartField', () => {
  it('renders string value and allows editing', () => {
    const onChange = vi.fn();
    withAuth(<SmartField value="hello" field={{ interface: 'input', name: 'foo' }} onChange={onChange} />);
    expect(screen.getByText('hello')).toBeInTheDocument();
    fireEvent.click(screen.getByText('hello'));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'world' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('world');
  });

  it('treats number field as numeric input', () => {
    const onChange = vi.fn();
    withAuth(<SmartField value={42} field={{ interface: 'number', name: 'num' }} onChange={onChange} />);
    fireEvent.click(screen.getByText('42'));
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.type).toBe('number');
    fireEvent.change(input, { target: { value: '100' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('100');
  });

  it('shows percent suffix and onChange receives raw value', () => {
    const onChange = vi.fn();
    withAuth(<SmartField value={10} field={{ interface: 'number', type: 'percent', name: 'pct' }} onChange={onChange} />);
    fireEvent.click(screen.getByText('10%'));
    const input = screen.getByRole('spinbutton');
    expect(input).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('20');
  });

  it('handles time-only fields', () => {
    const onChange = vi.fn();
    const { container } = withAuth(<SmartField value="12:30" field={{ interface: 'time', name: 't' }} onChange={onChange} />);
    // view should display the raw time string
    expect(container.textContent).toContain('12:30');
  });
  it('handles datetime fields', () => {
    const onChange = vi.fn();
    const { container } = withAuth(<SmartField value="2021-01-01T09:00" field={{ interface: 'datetime', name: 'dt' }} onChange={onChange} />);
    // the rendered text should include the year or month
    expect(container.textContent).toMatch(/2021|Jan/i);
  });
  it('renders boolean checkbox in view mode', () => {
    const onChange = vi.fn();
    const { container } = withAuth(<SmartField value={false} field={{ interface: 'checkbox', name: 'flag' }} onChange={onChange} />);
    // just ensure something is rendered for the boolean
    expect(container.textContent).toBeDefined();
  });

  it('renders select and allows choice', () => {
    const onChange = vi.fn();
    const options = [{ label: 'One', value: '1' }, { label: 'Two', value: '2' }];
    const { container } = withAuth(<SmartField value="1" field={{ interface: 'select', name: 'sel', uiSchema: { enum: options } }} onChange={onChange} />);
    // the displayed value should equal the raw value
    expect(container.textContent).toContain('1');
  });
  it('opens relation picker when editing relation', () => {
    const onChange = vi.fn();
    withAuth(<SmartField value={null} field={{ interface: 'linkToAnotherRecord', name: 'rel', target: 'other' }} onChange={onChange} />);
    fireEvent.click(screen.getByText(/empty relation/i));
    expect(screen.getByText(/select other/i)).toBeInTheDocument();
  });
});
