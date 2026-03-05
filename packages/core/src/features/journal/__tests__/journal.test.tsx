// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { JournalPage } from '@/pages/journal';
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
    const search = getByPlaceholderText(/search emotions/i);
    fireEvent.change(search, { target: { value: 'sad' } });
    expect(queryByText('sad')).toBeTruthy();
    expect(queryByText('happy')).toBeNull();

    // select 'sad'
    const sadBtn = queryByText('sad');
    expect(sadBtn).toBeTruthy();
    if (sadBtn) fireEvent.click(sadBtn);
    fireEvent.click(sadBtn);

    // now try typing a new emotion and hitting enter
    const search = getByPlaceholderText(/search emotions/i);
    fireEvent.change(search, { target: { value: 'curious' } });
    fireEvent.keyDown(search, { key: 'Enter', code: 'Enter' });
    const curiousBtn = queryByText('curious');
    expect(curiousBtn).toBeTruthy();
    if (curiousBtn) fireEvent.click(curiousBtn);
    // style should reflect selection (we only check existence here)
  });
});
