import React from 'react';
import { render, screen } from '@testing-library/react';
import { CalendarView } from '../calendar-view';
import { KanbanView } from '../kanban-view';
import { GalleryView } from '../gallery-view';
import { ListView } from '../list-view';

const emptyCollection = { name: 'test', fields: [] };
const dummyData: any[] = [];

const noop = () => {};

describe('View smoke tests', () => {
  it('calendar shows add button when onCreate provided', () => {
    render(
      <CalendarView
        data={dummyData}
        collection={emptyCollection}
        config={{}}
        onCreate={(d) => {}} // expect plus
      />
    );
    const btn = screen.getByLabelText(/add record/i);
    expect(btn).toBeInTheDocument();
  });

  it('kanban shows add card buttons for columns', () => {
    render(
      <KanbanView
        data={dummyData}
        collection={emptyCollection}
        config={{ groupByField: 'status' }}
        onCreate={(d) => {}}
      />
    );
    const btns = screen.getAllByLabelText(/add card/i);
    // should at least render one column button (uncategorized)
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
        data={dummyData}
        collection={emptyCollection}
        config={{}}
        onCreate={(d) => {}}
      />
    );
    const btn = screen.getByLabelText(/add record/i);
    expect(btn).toBeInTheDocument();
  });
});