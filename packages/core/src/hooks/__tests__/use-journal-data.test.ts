import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useJournalData, XP_PER_ENTRY } from '../use-journal-data';

// simple smoke tests verifying initial behaviour

describe('useJournalData', () => {
  it('starts with empty entries and can add/update/delete', () => {
    const { result } = renderHook(() => useJournalData());

    expect(result.current.entries).toHaveLength(0);
    act(() => {
      result.current.addEntry({ date: '2026-01-01', body: 'hello' } as any);
    });
    expect(result.current.entries).toHaveLength(1);

    act(() => {
      result.current.updateEntry({ date: '2026-01-01', body: 'changed' } as any);
    });
    expect(result.current.entries[0].body).toBe('changed');

    act(() => {
      result.current.deleteEntry({ date: '2026-01-01' } as any);
    });
    expect(result.current.entries).toHaveLength(0);
  });

  it('bookmarks toggle works', () => {
    const { result } = renderHook(() => useJournalData());
    act(() => result.current.bookmarks.toggleBookmark('foo' as any));
    expect(result.current.bookmarks.bookmarkedEntries).toContain('foo' as any);
    act(() => result.current.bookmarks.toggleBookmark('foo' as any));
    expect(result.current.bookmarks.bookmarkedEntries).not.toContain('foo' as any);
  });

  it('activities list and history functions', () => {
    const { result } = renderHook(() => useJournalData());
    const activities = result.current.activities;
    expect(Array.isArray(activities.list)).toBe(true);
    expect(activities.list.length).toBeGreaterThan(0);
    const sample = activities.list[0].id;
    act(() => {
      result.current.activities.mark(sample);
    });
    expect(Object.keys(result.current.activities.history)).toContain(sample);
  });
});
