import { renderHook, act } from '@testing-library/react';
import { useMedicationLog } from '../use-medication-log';

describe('useMedicationLog', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with default groups and empty log', () => {
    const { result } = renderHook(() => useMedicationLog());
    expect(result.current.groups.length).toBeGreaterThan(0);
    expect(result.current.log).toHaveLength(0);
  });

  it('marks a group done and persists history', () => {
    const { result } = renderHook(() => useMedicationLog());
    const groupId = result.current.groups[0].id;
    act(() => result.current.markGroupDone(groupId));

    expect(result.current.log.length).toBeGreaterThan(0);
    expect(result.current.isDoneToday(groupId)).toBe(true);

    // should persist between new hook instance
    const { result: result2 } = renderHook(() => useMedicationLog());
    expect(result2.current.isDoneToday(groupId)).toBe(true);
  });
});
