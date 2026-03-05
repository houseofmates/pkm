// @vitest-environment jsdom
// leaflet must be mocked before any imports that might load it
vi.mock('leaflet', () => ({ map: () => ({ remove: () => null }), tileLayer: () => ({ addTo: () => null }), polyline: () => ({ addTo: () => null }), icon: () => ({}) }));
// also stub the related LocationField which internally uses react-leaflet
vi.mock('../location-field', () => ({ LocationField: () => <div data-testid="location-field" /> }));
import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { SmartField } from '../smart-field';
import { AuthContext } from '@/contexts/auth-context';

import { describe, it, expect, vi } from 'vitest';

// stub the formula editor globally so formula tests can open it
vi.mock('@/components/formula-editor', () => ({
  FormulaEditor: ({ value, onSave }: any) => (
    <div>
      <span data-testid="formula">{value}</span>
      <button onClick={() => onSave('newcode')}>save</button>
    </div>
  ),
}));

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
    return render(
      <MemoryRouter>
        <AuthContext.Provider value={authValue as any}>{ui}</AuthContext.Provider>
      </MemoryRouter>
    );

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

  it('uses matching font size when editing large cells', () => {
    const onChange = vi.fn();
    withAuth(<SmartField value="big" field={{ interface: 'input', name: 'foo' }} size="lg" onChange={onChange} />);
    fireEvent.click(screen.getByText('big'));
    const input = screen.getByRole('textbox');
    // the class list should include text-lg so it doesn't shrink relative to view
    expect(input.className).toMatch(/text-lg/);
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
    // click to edit and change
    fireEvent.click(screen.getByText('12:30'));
    // input is type=time so use querySelector
    const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement;
    expect(timeInput).toBeInTheDocument();
    fireEvent.change(timeInput, { target: { value: '13:45' } });
    // click the save button (green check)
    const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.className.includes('text-green-500')) as HTMLButtonElement;
    expect(saveBtn).toBeDefined();
    fireEvent.click(saveBtn);
    expect(onChange).toHaveBeenCalledWith('13:45');
  });
  it('handles datetime fields', () => {
    const onChange = vi.fn();
    const { container } = withAuth(<SmartField value="2021-01-01T09:00" field={{ interface: 'datetime', name: 'dt' }} onChange={onChange} />);
    // the rendered text should include the year or month
    expect(container.textContent).toMatch(/2021|Jan/i);
    fireEvent.click(screen.getByText(/2021|Jan/i));
    const native = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    expect(native).toBeInTheDocument();
    fireEvent.change(native, { target: { value: '2022-02-02T10:00' } });
    // click save button
    const saveBtn = document.querySelector('button');
    saveBtn && fireEvent.click(saveBtn);
    expect(onChange).toHaveBeenCalledWith('2022-02-02T10:00');
  });
  it('renders boolean checkbox in view mode and allows toggling', () => {
    const onChange = vi.fn();
    withAuth(<SmartField value={false} field={{ interface: 'checkbox', name: 'flag' }} onChange={onChange} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('renders select view using label and allows choice', async () => {
    const onChange = vi.fn();
    const options = [{ label: 'One', value: '1', color: '#ff0000' }, { label: 'Two', value: '2' }];
    const { container } = withAuth(<SmartField value="1" field={{ interface: 'select', name: 'sel', uiSchema: { enum: options } }} onChange={onChange} />);
    // the displayed text should use the label, not the raw value
    expect(container.textContent).toContain('One');
    // and the background color of the pill should come from the option
    const pill = container.querySelector('div > span');
    expect(pill).toHaveStyle('background: #ff0000');

    // open editor by clicking
    fireEvent.click(screen.getByText('One'));
    const input = await screen.findByPlaceholderText('search...');
    expect(input).toBeInTheDocument();

    // choose second option via search
    fireEvent.change(input, { target: { value: 'Two' } });
    const opt = await screen.findByText('Two');
    fireEvent.click(opt);
    expect(onChange).toHaveBeenCalledWith('2');

    // right-click the first option to set a color
    const firstDiv = screen.getByText('One').closest('div');
    expect(firstDiv).toBeTruthy();
    if (firstDiv) fireEvent.contextMenu(firstDiv);
    const colorInput = document.querySelector('input[type="color"]') as HTMLInputElement;
    expect(colorInput).toBeInTheDocument();
    fireEvent.change(colorInput, { target: { value: '#00ff00' } });
    // pill color should now be applied when rendering view mode again
    fireEvent.click(screen.getByText('One')); // close editor
    expect(colorInput.value).toBe('#00ff00');

    // type a new option and add it
    fireEvent.change(input, { target: { value: 'Three' } });
    const add = await screen.findByText(/add "Three"/i);
    fireEvent.click(add);
    expect(onChange).toHaveBeenCalledWith('three');
  });
  it('opens relation picker when editing relation', () => {
    const onChange = vi.fn();
    withAuth(<SmartField value={null} field={{ interface: 'linkToAnotherRecord', name: 'rel', target: 'other' }} onChange={onChange} />);
    fireEvent.click(screen.getByText(/empty relation/i));
    expect(screen.getByText(/select other/i)).toBeInTheDocument();
  });

  it('stores only specified property when relation property is configured', async () => {
    const onChange = vi.fn();
    // prepare client to return one option
    fakeClient.listRecords.mockResolvedValueOnce({ data: [{ id: 'r1', name: 'Alice', title: 'Ms A' }] });
    withAuth(<SmartField value={null} field={{ interface: 'linkToAnotherRecord', name: 'rel', target: 'other', property: 'name' }} onChange={onChange} />);
    fireEvent.click(screen.getByText(/empty relation/i));
    await waitFor(() => screen.getByText(/select other/i));
    // option should show title first
    const option = await screen.findByText('Ms A');
    fireEvent.click(option);
    expect(onChange).toHaveBeenCalledWith('Alice');
  });

  it('opens formula editor for formula type and saves code', () => {
    const onChange = vi.fn();
    withAuth(<SmartField value="init" field={{ interface: 'input', type: 'formula', name: 'f' }} onChange={onChange} />);
    // formula fields render a placeholder instead of the raw value
    const placeholder = screen.getByText(/<script/);
    expect(placeholder).toBeInTheDocument();
    fireEvent.click(placeholder);
    expect(screen.getByTestId('formula')).toBeInTheDocument();
    fireEvent.click(screen.getByText('save'));
    expect(onChange).toHaveBeenCalledWith('newcode');
  });

  it('edits color field and updates value', () => {
    const onChange = vi.fn();
    withAuth(<SmartField value="#000000" field={{ interface: 'input', name: 'color' }} onChange={onChange} />);
    fireEvent.click(screen.getByText('#000000'));
    // color input should appear (use querySelector because role is not reliable)
    const colorInput = document.querySelector('input[type="color"]') as HTMLInputElement;
    expect(colorInput).toBeInTheDocument();
    fireEvent.change(colorInput!, { target: { value: '#ff0000' } });
    // the save button has green icon, so pick the button with that class
    const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.className.includes('text-green-500')) as HTMLButtonElement;
    expect(saveBtn).toBeDefined();
    fireEvent.click(saveBtn);
    expect(onChange).toHaveBeenCalledWith('#ff0000');
  });

  it('uploads file and returns url', async () => {
    const onChange = vi.fn();
    withAuth(<SmartField value={null} field={{ interface: 'attachment', name: 'file' }} onChange={onChange} />);
    // click the default empty placeholder to begin editing
    fireEvent.click(screen.getByText(/empty/i));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const blob = new Blob(['hello'], { type: 'text/plain' });
    const file = new File([blob], 'test.txt');
    // trigger file input change
    fireEvent.change(fileInput, { target: { files: [file] } });
    // wait until the text input (url display) updates
    const textInput = await waitFor(() => document.querySelector('input[placeholder="paste url or upload..."]') as HTMLInputElement);
    await waitFor(() => expect(textInput.value).toBe('http://example.com/fake'));
    // after upload the save button should appear, click it to commit
    const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.className.includes('text-green-500')) as HTMLButtonElement;
    expect(saveBtn).toBeDefined();
    fireEvent.click(saveBtn);
    // our fakeClient.upload resolves with a url so onChange should be called
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('http://example.com/fake');
    });
  });

  it('handles multipleSelect editing with search and checkboxes', async () => {
    const onChange = vi.fn();
    const options = [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }];
    withAuth(<SmartField value={["a"]} field={{ interface: 'multipleSelect', name: 'multi', uiSchema: { enum: options } }} onChange={onChange} />);
    fireEvent.click(screen.getByText('a'));
    const input = await screen.findByPlaceholderText('search...');
    expect(input).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'B' } });
    const item = await screen.findByText('B');
    fireEvent.click(item);
    fireEvent.click(screen.getByText('done'));
    expect(onChange).toHaveBeenCalledWith(["a", "b"]);
  });

  it('allows json editing and parses correctly', () => {
    const onChange = vi.fn();
    withAuth(<SmartField value={{ foo: 'bar' }} field={{ interface: 'json', name: 'js' }} onChange={onChange} />);
    fireEvent.click(screen.getByText(/\{"foo":"bar"\}/));
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '{"foo":"baz"}' } });
    // click the first button (save)
    const btn = document.querySelector('button');
    btn && fireEvent.click(btn);
    expect(onChange).toHaveBeenCalledWith({ foo: 'baz' });
  });
});
