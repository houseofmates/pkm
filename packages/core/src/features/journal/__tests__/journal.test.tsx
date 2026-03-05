import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { create, act } from 'react-test-renderer';

import { JournalPage } from '@/pages/journal';

// basic smoke test for mood buttons reflecting MOODS constant and behavior

describe('JournalPage', () => {
  it('renders mood emoji images and can toggle selection', () => {
    const tree = create(<JournalPage />);
    const root = tree.root;

    // find the mood button for the first mood (amazing!) by alt text
    const moodImages = root.findAll((n) => n.type === 'img' && n.props.alt?.toLowerCase().includes('amazing'));
    expect(moodImages.length).toBe(1);
    const btn = moodImages[0].parent; // image is direct child of button

    // initially not active (no boxShadow prop)
    expect(btn.props.style.boxShadow).toBeUndefined();

    act(() => {
      btn.props.onClick();
    });

    expect(btn.props.style.boxShadow).toContain('0 0 0 2px');

    act(() => {
      btn.props.onClick();
    });

    expect(btn.props.style.boxShadow).toBe('none');
  });
});
