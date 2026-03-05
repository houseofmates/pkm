// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { JournalPage } from '@/pages/journal';
import api from '@/api/nocobase-client';
import { AuthProvider } from '@/contexts/auth-context';

// basic smoke test for mood buttons reflecting MOODS constant and behavior

describe('JournalPage', () => {
  it('renders mood emoji images and can toggle selection; emotions are searchable', () => {
    const { getByAltText, getByPlaceholderText, queryByText } = render(
      <MemoryRouter>
        <AuthProvider>
          <JournalPage />
        </AuthProvider>
      </MemoryRouter>
    );

    // moods unchanged
    const img = getByAltText(/amazing/i) as HTMLImageElement;
    expect(img.src).toMatch(/amazing\.png$/);
    const btn = img.closest('button');
    expect(btn).toBeTruthy();
    expect(img.style.opacity).toBe('0.7');
    fireEvent.click(btn!);
    expect(img.style.opacity).toBe('1');
    fireEvent.click(btn!);
    expect(img.style.opacity).toBe('0.7');

    // emotions section: typing 'sad' should show that emotion button only
    const searchInput = getByPlaceholderText(/search emotions/i);
    fireEvent.change(searchInput, { target: { value: 'sad' } });
    expect(queryByText('sad')).toBeTruthy();
    expect(queryByText('happy')).toBeNull();

    // select 'sad'
    const sadBtn = queryByText('sad');
    expect(sadBtn).toBeTruthy();
    if (sadBtn) fireEvent.click(sadBtn);
    fireEvent.click(sadBtn);

    // now try typing a new emotion and hitting enter
    fireEvent.change(searchInput, { target: { value: 'curious' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });
    const curiousBtn = queryByText('curious');
    expect(curiousBtn).toBeTruthy();
    if (curiousBtn) fireEvent.click(curiousBtn);
    // style should reflect selection (we only check existence here)
  });

  it('exports entries within selected date range', async () => {
    const record1: any = { date: '2026-03-01', mood: '2', activities: '[]', body: '', timestamp: '2026-03-01T00:00:00Z', tags: '[]' };
    const record2: any = { date: '2026-03-05', mood: '4', activities: '[]', body: '', timestamp: '2026-03-05T00:00:00Z', tags: '[]' };
    vi.spyOn(api, 'listRecords').mockResolvedValue({ data: [record1, record2] });
    let blobText = '';
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: any) => {
      blob.text().then((t: string) => { blobText = t; });
      return 'blob://fake';
    });

    const { getByTitle, getAllByDisplayValue } = render(
      <MemoryRouter>
        <AuthProvider>
          <JournalPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const dateInputs = getAllByDisplayValue('', { selector: 'input[type=date]' });
    const fromInput = dateInputs[0];
    const toInput = dateInputs[1];
    fireEvent.change(fromInput, { target: { value: '2026-03-03' } });
    fireEvent.change(toInput, { target: { value: '2026-03-10' } });
    fireEvent.click(getByTitle('export'));
    await new Promise(res => setTimeout(res, 0));
    expect(blobText).toContain('2026-03-05');
    expect(blobText).not.toContain('2026-03-01');
  });
});
