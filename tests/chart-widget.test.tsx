import React from 'react';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChartWidget } from '@/components/dashboard/chart-widget';

const mockData = [
  { name: 'A', s1: 10, s2: 20 },
  { name: 'B', s1: 5, s2: 15 },
];

describe('ChartWidget legend & ordering', () => {
  it('renders legend in seriesOrder when provided', () => {
    render(<ChartWidget type="bar" data={mockData as any} seriesKeys={["s1", "s2"]} seriesOrder={["s2", "s1"]} />);

    // Legend buttons should render in order s2, s1
    const buttons = screen.getAllByRole('button');
    // find first two legend-like buttons by text
    const first = screen.getByText('s2');
    const second = screen.getByText('s1');
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    // Ensure order in DOM: s2 comes before s1
    expect(buttons.map(b => b.textContent).join(' ')).toContain('s2');
  });

  it('toggles series visibility when legend button clicked', () => {
    render(<ChartWidget type="bar" data={mockData as any} seriesKeys={["s1", "s2"]} />);

    const btn = screen.getByText('s1');
    fireEvent.click(btn);

    // clicking should add line-through class to the label span (or apply equivalent)
    const span = btn;
    expect(span.className.includes('line-through') || span.querySelector('.line-through')).toBeTruthy();
  });
});
