import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';

// mock the hook we just wrote
vi.mock('@/hooks/use-collection-data', () => ({
  useCollectionData: () => ({
    collection: { name: 'foo', fields: [] },
    records: [],
    loading: false,
    fetchError: null,
    handleDirectCreate: vi.fn(),
    handleUpdateRecord: vi.fn(),
    handleDeleteRecord: vi.fn(),
    handleUndoDelete: vi.fn(),
    restoreRecord: vi.fn(),
    fetchData: vi.fn(),
    setCollection: vi.fn(),
    setRecords: vi.fn(),
  })
}));
vi.mock('@/contexts/fronter-context', () => ({
  useFronter: () => ({ activeFronters: [] }),
}));
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    client: {
      listCollections: vi.fn().mockResolvedValue({ data: [] }),
    },
    isAuthenticated: true,
    login: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { CollectionDetailPage } from '../collection-detail';

describe('CollectionDetailPage', () => {
  it('renders header and view selector', () => {
    render(
      <MemoryRouter>
        <CollectionDetailPage collectionName="foo" />
      </MemoryRouter>
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
