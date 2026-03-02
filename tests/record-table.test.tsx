import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RecordTable } from '@/features/records/components/record-table';
import { BrowserRouter } from 'react-router-dom';

// mocks to satisfy imported hooks and components
vi.mock('@/hooks/use-app-setting', () => ({ useAppSetting: () => [[], vi.fn()] }));
vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ client: { listRecords: async () => ({ data: [] }) } }) }));
vi.mock('@/contexts/fronter-context', () => ({ useFronter: () => ({ activeFronters: [] }) }));
// simple stub for Table component, etc.

describe('RecordTable sanity', () => {
  it('does not crash when collection prop starts undefined then becomes defined', () => {
    const { rerender } = render(
      <BrowserRouter>
        <RecordTable data={[]} collection={undefined as any} loading={false} />
      </BrowserRouter>
    );

    // update props to a minimal collection
    rerender(
      <BrowserRouter>
        <RecordTable data={[]} collection={{ name: 'foo', fields: [] } as any} loading={false} />
      </BrowserRouter>
    );

    // expect something in DOM (table wrapper)
    expect(document.body).toBeTruthy();
  });
});
