import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { JournalPage } from '@/pages/journal';

// basic smoke test for mood buttons reflecting MOODS constant and behavior

describe('JournalPage', () => {
  it('renders mood emoji images and can toggle selection', () => {
    render(<JournalPage />);

    // moods are rendered with alt text equal to the label
    const amazing = screen.getByAltText(/amazing/i);
    expect(amazing).toBeInTheDocument();

    const btn = amazing.closest('button');
    expect(btn).toBeTruthy();

    // initially not active (no box-shadow)
    expect(btn).not.toHaveStyle('box-shadow: 0 0 0 2px');

    fireEvent.click(btn!);

    // after click it should get the active outline
    expect(btn).toHaveStyle('box-shadow: 0 0 0 2px');

    // clicking again clears it
    fireEvent.click(btn!);
    expect(btn).not.toHaveStyle('box-shadow: 0 0 0 2px');
  });
});
