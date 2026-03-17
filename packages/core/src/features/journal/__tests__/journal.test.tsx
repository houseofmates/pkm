// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { JournalPage } from '@/pages/journal';
import api from '@/api/nocobase-client';
import { AuthProvider } from '@/contexts/auth-context';

// basic smoke test for mood buttons reflecting MOODS constant and behavior

describe('JournalPage', () => {
  it('renders mood emoji buttons and can toggle selection; emotions are searchable', () => {
    const { getByLabelText, getByPlaceholderText, queryByText } = render(
      <MemoryRouter>
        <AuthProvider>
          <JournalPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const moodBtn = getByLabelText(/amazing/i);
    expect(moodBtn).toBeTruthy();
    // clicking toggles the background style between inactive/active colors
    expect(moodBtn).toHaveStyle('background: #000000');
    fireEvent.click(moodBtn);
    expect(moodBtn).toHaveStyle('background: #8b5cf633');
    fireEvent.click(moodBtn);
    expect(moodBtn).toHaveStyle('background: #000000');

    // emotions section: default list includes 'sad' and new ones like 'infuriated'
    const searchInput = getByPlaceholderText(/search emotions/i);
    fireEvent.change(searchInput, { target: { value: 'sad' } });
    expect(queryByText('sad')).toBeTruthy();
    expect(queryByText('happy')).toBeNull();
    // and ensure the newly added emotion appears in the searchable list
    fireEvent.change(searchInput, { target: { value: 'infuriated' } });
    expect(queryByText('infuriated')).toBeTruthy();

    // select 'sad'
    const sadBtn = queryByText('sad');
    expect(sadBtn).toBeTruthy();
    if (sadBtn) fireEvent.click(sadBtn);
    fireEvent.click(sadBtn!);

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

    const { getByTitle, getByLabelText } = render(
      <MemoryRouter>
        <AuthProvider>
          <JournalPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const fromInput = getByLabelText('export from date');
    const toInput = getByLabelText('export to date');
    fireEvent.change(fromInput, { target: { value: '2026-03-03' } });
    fireEvent.change(toInput, { target: { value: '2026-03-10' } });
    fireEvent.click(getByTitle('export'));
    await new Promise(res => setTimeout(res, 0));
    expect(blobText).toContain('2026-03-05');
    expect(blobText).not.toContain('2026-03-01');
  });

  it('lets user set a daily reminder time', () => {
    localStorage.clear();
    const { getByLabelText, container } = render(
      <MemoryRouter>
        <AuthProvider>
          <JournalPage />
        </AuthProvider>
      </MemoryRouter>
    );
    const remBtn = getByLabelText('toggle reminder');
    fireEvent.click(remBtn);
    const timeInput = getByLabelText('reminder time');
    expect(timeInput).toBeTruthy();
    if (timeInput) {
      fireEvent.change(timeInput, { target: { value: '08:30' } });
      expect(localStorage.getItem('journal_reminder')).toBe('08:30');
    }
  });
});
