import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { JournalPage } from '@/pages/journal';
import { AuthProvider } from '@/contexts/auth-context';

// basic smoke test for mood buttons reflecting MOODS constant and behavior

describe('JournalPage', () => {
  it('renders mood emoji images and can toggle selection', () => {
    const { getByAltText } = render(
      <MemoryRouter>
        <AuthProvider>
          <JournalPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const img = getByAltText(/amazing/i) as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toMatch(/amazing\.png$/);

    const btn = img.closest('button');
    expect(btn).toBeTruthy();

    // opacity should change when active
    expect(img).toHaveStyle('opacity: 0.7');
    fireEvent.click(btn!);
    expect(img).toHaveStyle('opacity: 1');
    fireEvent.click(btn!);
    expect(img).toHaveStyle('opacity: 0.7');
  });
});
