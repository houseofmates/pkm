// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor, within, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { JournalPage } from '@/pages/journal';
import api from '@/api/nocobase-client';
import { AuthProvider } from '@/contexts/auth-context';

// basic smoke test for mood buttons reflecting MOODS constant and behavior

describe('JournalPage', () => {
  it.skip('renders mood emoji buttons and can toggle selection; emotions are searchable', () => {
    const { getByText, getByPlaceholderText, queryByText } = render(
      <MemoryRouter>
        <AuthProvider>
          <JournalPage />
        </AuthProvider>
      </MemoryRouter>
    );

    // moods unchanged - there should be a button showing the "amazing" emoji
    const moodBtn = getByText('😁');
    expect(moodBtn).toBeTruthy();
    // clicking toggles the border/background style
    expect(moodBtn).toHaveStyle('border: 2px solid rgba(255,255,255,0.08)');
    fireEvent.click(moodBtn);
    expect(moodBtn).toHaveStyle('border: 2px solid #8b5cf6');
    fireEvent.click(moodBtn);
    expect(moodBtn).toHaveStyle('border: 2px solid rgba(255,255,255,0.08)');

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

  it.skip('exports entries within selected date range', async () => {
    const record1: any = { date: '2026-03-01', mood: '2', activities: '[]', body: '', timestamp: '2026-03-01T00:00:00Z', tags: '[]' };
    const record2: any = { date: '2026-03-05', mood: '4', activities: '[]', body: '', timestamp: '2026-03-05T00:00:00Z', tags: '[]' };
    vi.spyOn(api, 'listRecords').mockResolvedValue({ data: [record1, record2] });
    let blobText = '';
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: any) => {
      blob.text().then((t: string) => { blobText = t; });
      return 'blob://fake';
    });

    const { getByTitle } = render(
      <MemoryRouter>
        <AuthProvider>
          <JournalPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const dateInputs = Array.from(document.querySelectorAll('input[type=date]')) as HTMLInputElement[];
    const fromInput = dateInputs[0];
    const toInput = dateInputs[1];
    fireEvent.change(fromInput, { target: { value: '2026-03-03' } });
    fireEvent.change(toInput, { target: { value: '2026-03-10' } });
    fireEvent.click(getByTitle('export'));
    await new Promise(res => setTimeout(res, 0));
    expect(blobText).toContain('2026-03-05');
    expect(blobText).not.toContain('2026-03-01');
  });

  it('toggles an inline activity from the journal composer', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <JournalPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const takePills = await screen.findByRole('button', { name: /take pills/i });
    expect(takePills).toBeTruthy();
    fireEvent.click(takePills);
    await waitFor(() => {
      expect(screen.getByText(/1 activity selected/i)).toBeInTheDocument();
    });
    fireEvent.click(takePills);
    await waitFor(() => {
      expect(screen.queryByText(/activity selected/i)).toBeNull();
    });
  });

  it.skip('lets user set a daily reminder time', () => {
    localStorage.clear();
    const { getByTitle, container } = render(
      <MemoryRouter>
        <AuthProvider>
          <JournalPage />
        </AuthProvider>
      </MemoryRouter>
    );
    const remBtn = container.querySelectorAll('button[title="reminder"]')[1] as HTMLButtonElement;
    fireEvent.click(remBtn);
    const timeInput = container.querySelector('input[type=time]');
    expect(timeInput).toBeTruthy();
    if (timeInput) {
      fireEvent.change(timeInput, { target: { value: '08:30' } });
      expect(localStorage.getItem('journal_reminder')).toBe('08:30');
    }
  });
});
