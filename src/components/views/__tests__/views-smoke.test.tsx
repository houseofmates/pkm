import React from 'react';
import { render, screen } from '@testing-library/react';
import { CalendarView } from '../calendar-view';
import { KanbanView } from '../kanban-view';
import { GalleryView } from '../gallery-view';
import { ListView } from '../list-view';
import { AuthContext } from '@/contexts/auth-context';

// same virtualization stubs used by list view tests
import { vi } from 'vitest';
vi.mock('react-window', () => ({
  List: ({ children, itemCount, itemData }: any) => (
    <div>
      {Array.from({ length: itemCount }).map((_, i) => (
        <div key={i}>{children({ index: i, style: {}, data: itemData })}</div>
      ))}
    </div>
  ),
}));
vi.mock('react-virtualized-auto-sizer', () => ({
  AutoSizer: ({ children }: any) => <div>{children({ width: 100, height: 100 })}</div>,
}));

const emptyCollection = { name: 'test', fields: [] };
// collection with a date field for calendar
const dateCollection = { name: 'test', fields: [{ name: 'when', interface: 'date' }] };
const dummyData: any[] = [{ id: '1', when: new Date().toISOString(), status: null }];

const noop = () => {};

describe('View smoke tests', () => {
  it('calendar shows add button when onCreate and dateField provided', () => {
    render(
      <CalendarView
        data={dummyData}
        collection={dateCollection}
        config={{ dateField: 'when' }}
        onCreate={(d) => {}} // expect plus
      />
    );
    const btn = screen.getByLabelText(/add record/i);
    expect(btn).toBeInTheDocument();
  });

  it('kanban shows add card buttons for columns', () => {
    const authValue = { token: '', isAuthenticated: true, login: () => {}, logout: () => {}, client: {} };
    render(
      <AuthContext.Provider value={authValue as any}>
        <KanbanView
          data={dummyData}
          collection={emptyCollection}
          config={{ groupByField: 'status' }}
          onCreate={(d) => {}}
        />
      </AuthContext.Provider>
    );
    const btns = screen.getAllByLabelText(/add card/i);
    expect(btns.length).toBeGreaterThan(0);
  });

  it('gallery shows add item tile', () => {
    render(
      <GalleryView
        data={dummyData}
        collection={emptyCollection}
        config={{}}
        onCreate={(d) => {}}
      />
    );
    const tile = screen.getByLabelText(/add item/i);
    expect(tile).toBeInTheDocument();
  });

  it('list view shows add button', () => {
    render(
      <ListView
        data={[...dummyData]}
        collection={emptyCollection}
        config={{}}
        onCreate={(d) => {}}
      />
    );
    const btn = screen.getByLabelText(/add record/i);
    expect(btn).toBeInTheDocument();
  });
});