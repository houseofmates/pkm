import { renderHook, act } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { useDrawing } from '../use-drawing';

type MockStoreState = {
  history: { ops: string[] };
  loadFromOplog: ReturnType<typeof vi.fn>;
  setDrawingId: ReturnType<typeof vi.fn>;
  setElements: ReturnType<typeof vi.fn>;
  setTool: ReturnType<typeof vi.fn>;
  setMode: ReturnType<typeof vi.fn>;
};

const edgelessStoreMock = vi.hoisted(() => {
  const createStoreState = (): MockStoreState => ({
    history: { ops: [] },
    loadFromOplog: vi.fn(async () => {}),
    setDrawingId: vi.fn(),
    setElements: vi.fn(),
    setTool: vi.fn(),
    setMode: vi.fn(),
  });

  let mockStoreState = createStoreState();
  const subscribers = new Set<(state: MockStoreState) => void>();

  const mockUseEdgelessStore = vi.fn(<T>(selector: (state: MockStoreState) => T = (s) => s as unknown as T) => {
    return selector(mockStoreState);
  }) as unknown as {
    <T>(selector?: (state: MockStoreState) => T): T;
    subscribe: (listener: (state: MockStoreState) => void) => () => void;
    getState: () => MockStoreState;
    setState: (partial: Partial<MockStoreState> | ((state: MockStoreState) => void)) => void;
  };

  mockUseEdgelessStore.subscribe = (listener) => {
    subscribers.add(listener);
    return () => subscribers.delete(listener);
  };

  mockUseEdgelessStore.getState = () => mockStoreState;
  mockUseEdgelessStore.setState = (partial) => {
    if (typeof partial === 'function') {
      partial(mockStoreState);
    } else {
      Object.assign(mockStoreState, partial);
    }
    subscribers.forEach((listener) => listener(mockStoreState));
  };

  return {
    exports: {
      useEdgelessStore: mockUseEdgelessStore,
    },
    reset() {
      mockStoreState = createStoreState();
      subscribers.clear();
    },
  };
});

vi.mock('@/features/edgeless/store', () => edgelessStoreMock.exports);

// stub canvasSync API
vi.mock('@/features/edgeless/sync/canvas-sync', () => ({
  canvasSync: {
    start: vi.fn(),
    getSyncState: vi.fn(() => ({ pendingCount: 0 })),
    forceSync: vi.fn(async () => true),
  },
}));

vi.mock('@/features/edgeless/storage', () => ({
  updateDrawingMeta: vi.fn(async () => ({})),
  saveCheckpoint: vi.fn(async () => ({})),
}));

import { canvasSync } from '@/features/edgeless/sync/canvas-sync';
import { updateDrawingMeta, saveCheckpoint } from '@/features/edgeless/storage';

describe('useDrawing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    edgelessStoreMock.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('initializes and returns basic state', async () => {
    const { result } = renderHook(() => useDrawing('myid'));
    expect(result.current.title).toBe('untitled drawing');

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(updateDrawingMeta).toHaveBeenCalled();
    expect(canvasSync.start).toHaveBeenCalled();
  });
});
